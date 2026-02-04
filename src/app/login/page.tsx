"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/logo";
import { useFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const formSchema = z.object({
  userId: z.string().min(1, { message: "User ID is required." }),
  password: z.string().min(1, { message: "Password is required." }),
  captcha: z.boolean().refine((val) => val === true, {
    message: "Please confirm you are not a robot.",
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      password: "",
      captcha: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready."});
      return;
    }
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const dummyEmail = `${values.userId}@tradeflow.app`;
      const userCredential = await signInWithEmailAndPassword(auth, dummyEmail, values.password);

      // Check if the user is an admin
      const adminDocRef = doc(firestore, "admins", userCredential.user.uid);
      const adminDocSnap = await getDoc(adminDocRef);

      if (adminDocSnap.exists() && adminDocSnap.data().role === 'admin') {
        toast({ title: "Admin Login Successful", description: "Redirecting to admin dashboard..." });
        router.push('/adminnarayan/dashboard');
      } else {
        toast({ title: "Logging In...", description: "Please wait while we log you in." });
        router.push('/buy');
      }

    } catch (error: any) {
      let description = "An unknown error occurred. Please try again.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          description = "The User ID or password you entered is incorrect.";
      }
      toast({ variant: "destructive", title: "Login Failed", description });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
             <Logo />
          </Link>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <div className="flex justify-between">
                        <FormLabel>Password</FormLabel>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Logging in..." : "Log In"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
