"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/logo";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useEffect, useState, Suspense } from "react";
import { useFirebase } from "@/firebase";
import { onAuthStateChanged, updateProfile, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SECURITY_QUESTIONS } from "@/lib/constants";

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  dob: z.date({
    required_error: "A date of birth is required.",
  }),
  userId: z.string().min(3, { message: "User ID must be at least 3 characters." }).regex(/^[a-zA-Z0-9_]+$/, "User ID can only contain letters, numbers, and underscores."),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  securityQuestion: z.string().min(1, "Please select a security question."),
  securityAnswer: z.string().min(2, { message: "Answer must be at least 2 characters." }),
  captcha: z.boolean().refine((val) => val === true, {
    message: "Please confirm you are not a robot.",
  }),
});

function SignupFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const [isSigningUp, setIsSigningUp] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      userId: searchParams.get("userId") || "",
      password: "",
      securityQuestion: "",
      securityAnswer: "",
      captcha: false,
    },
  });

  useEffect(() => {
    if (!auth || !firestore) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && isSigningUp) {
        setIsSigningUp(false);
        const values = form.getValues();
        
        try {
          // 1. Update auth user profile
          await updateProfile(user, { displayName: values.userId });

          // 2. Create firestore document
          const userDocRef = doc(firestore, "users", user.uid);
          const newUserDoc = {
              id: user.uid,
              userId: values.userId,
              fullName: values.fullName,
              dob: values.dob.toISOString().split('T')[0], // YYYY-MM-DD
              isBanned: false,
              isOnHold: false,
              tradeVolume: "0",
              completedTrades: 0,
              usernameChanged: false,
              createdAt: new Date().toISOString(),
              feedbackScore: 100,
              accountAge: "0 days",
              photoURL: "",
              preferredCurrency: "USD",
              securityQuestion: values.securityQuestion,
              securityAnswer: values.securityAnswer, // In a real app, this should be hashed
          };
          await setDoc(userDocRef, newUserDoc);

          toast({ title: "Account Created", description: "Redirecting..." });
          router.push('/buy');

        } catch (error: any) {
          console.error("Error creating user profile:", error);
          toast({ variant: "destructive", title: "Signup Error", description: "Could not save user profile." });
        }
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, isSigningUp, form, router, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready."});
      return;
    }
    setIsSigningUp(true);

    try {
      // Check for userId uniqueness
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("userId", "==", values.userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          form.setError("userId", {
              type: "manual",
              message: "This User ID is not available. Please choose another one.",
          });
          setIsSigningUp(false);
          return;
      }
      
      await setPersistence(auth, browserLocalPersistence);
      const dummyEmail = `${values.userId}@tradeflow.app`;
      await createUserWithEmailAndPassword(auth, dummyEmail, values.password);

    } catch (error: any) {
        console.error("Error during sign up:", error);
        let description = "An unexpected error occurred. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            description = "This User ID is already associated with an account.";
            form.setError("userId", { type: "manual", message: description });
        }
        toast({ variant: "destructive", title: "Signup Failed", description });
        setIsSigningUp(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
             <Logo />
          </Link>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>
            Join TradeFlow to start trading securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User ID</FormLabel>
                    <FormControl>
                      <Input placeholder="YourUniqueUserID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="securityQuestion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Question</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a security question" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {SECURITY_QUESTIONS.map((q, i) => (
                                <SelectItem key={i} value={q}>{q}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="securityAnswer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Answer</FormLabel>
                    <FormControl>
                      <Input placeholder="Your answer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="captcha"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I am not a robot
                      </FormLabel>
                    </div>
                    <FormMessage className="absolute"/>
                  </FormItem>
                )}
              />
               <div className="text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link> and{" "}
                <Link href="/policy" className="underline hover:text-primary">Privacy Policy</Link>.
              </div>
              <Button type="submit" className="w-full" disabled={isSigningUp}>
                {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSigningUp ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Log In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupFormComponent />
    </Suspense>
  )
}

    