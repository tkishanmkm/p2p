
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
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, updateProfile, type User as AuthUser } from "firebase/auth";
import { doc, setDoc, getDoc, type Firestore } from "firebase/firestore";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createUserSession } from "@/lib/users";

const formSchema = z.object({
  adminId: z.string().min(1, { message: "Admin ID is required." }),
  password: z.string().min(1, { message: "Password is required." }),
  captcha: z.boolean().refine((val) => val === true, {
    message: "Please confirm you are not a robot.",
  }),
});


export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adminId: "",
      password: "",
      captcha: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) {
      toast({ variant: "destructive", title: "Auth service not ready", description: "Please try again in a moment." });
      return;
    }

    setIsLoggingIn(true);
    const adminEmail = `${values.adminId}@email.com`;

    try {
        await setPersistence(auth, browserLocalPersistence);
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, values.password);
        const { user } = userCredential;

        // Ensure the admin has a role document in /admins
        const adminRoleRef = doc(firestore, 'admins', user.uid);
        const adminRoleSnap = await getDoc(adminRoleRef);
        if (!adminRoleSnap.exists()) {
            await setDoc(adminRoleRef, { role: "admin", createdAt: new Date().toISOString() });
        }
        
        const sessionId = await createUserSession(firestore, user);
        if (sessionId) {
            sessionStorage.setItem('sessionId', sessionId);
        }
        
        toast({
            title: "Login Successful",
            description: "Redirecting to admin dashboard...",
        });
        router.push("/adminnarayan/dashboard");

    } catch (signInError: any) {
        if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/user-not-found') {
            try {
                // If sign-in fails, it might be a first-time setup. Attempt to create the account.
                const newUserCredential = await createUserWithEmailAndPassword(auth, adminEmail, values.password);
                const { user: newUser } = newUserCredential;
                await updateProfile(newUser, { displayName: values.adminId });
                
                // Create user document FIRST to prevent race conditions
                const userDocRef = doc(firestore, 'users', newUser.uid);
                await setDoc(userDocRef, {
                    id: newUser.uid,
                    userId: values.adminId,
                    fullName: "Administrator",
                    dob: "1970-01-01",
                    isBanned: false,
                    isOnHold: false,
                    tradeVolume: 0,
                    completedTrades: 0,
                    usernameChanged: true, // Prevent admin from changing their ID
                    createdAt: new Date().toISOString(),
                    feedbackScore: 100,
                    positiveFeedback: 0,
                    negativeFeedback: 0,
                    avgPaymentTime: 0,
                    avgReleaseTime: 0,
                    photoURL: "",
                    preferredCurrency: "USD",
                    securityQuestion: "Admin account", // Not used for password recovery
                    securityAnswer: "Admin account", // Not used for password recovery
                    isAdminAccount: true, // Special flag to identify admin profile
                    blockedUsers: [],
                });

                // Then create admin role and session
                const adminRoleRef = doc(firestore, 'admins', newUser.uid);
                await setDoc(adminRoleRef, { role: "admin", createdAt: new Date().toISOString() });

                const newSessionId = await createUserSession(firestore, newUser);
                if (newSessionId) {
                    sessionStorage.setItem('sessionId', newSessionId);
                }
                
                toast({
                    title: "Admin Account Created",
                    description: "First-time setup successful. Logging you in...",
                });
                router.push("/adminnarayan/dashboard");

            } catch (signUpError: any) {
                 if (signUpError.code === 'auth/email-already-in-use') {
                    // This means the user exists, so the original sign-in error was due to a wrong password.
                    toast({
                      variant: "destructive",
                      title: "Login Failed",
                      description: "Invalid Admin ID or password.",
                    });
                } else {
                    // A different error occurred during the account creation attempt.
                    toast({
                        variant: "destructive",
                        title: "Admin Setup Failed",
                        description: signUpError.message,
                    });
                }
            }
        } else {
            // A different, unexpected error occurred during sign-in.
            toast({
              variant: "destructive",
              title: "Login Failed",
              description: signInError.message || "An unknown error occurred.",
            });
        }
    } finally {
        setIsLoggingIn(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
             <Logo />
          </Link>
          <CardTitle className="text-2xl">Admin Panel Access</CardTitle>
          <CardDescription>
            Restricted area. Authorized personnel only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="adminId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Admin ID" {...field} />
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
              <Button type="submit" className="w-full" variant="destructive" disabled={isLoggingIn}>
                {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Authenticate
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
