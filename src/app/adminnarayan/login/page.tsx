
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
import { doc, setDoc, getDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  adminId: z.string().min(1, { message: "Admin ID is required." }),
  password: z.string().min(1, { message: "Password is required." }),
  captcha: z.boolean().refine((val) => val === true, {
    message: "Please confirm you are not a robot.",
  }),
});

// Helper function to create the admin's profile in the /users collection if it doesn't exist.
async function ensureAdminProfileExists(db: Firestore, user: AuthUser, adminId: string) {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
            id: user.uid,
            userId: adminId,
            fullName: `${adminId} (Admin)`,
            dob: "1970-01-01", // Placeholder DOB
            isBanned: false,
            isOnHold: false,
            tradeVolume: "0",
            completedTrades: 0,
            usernameChanged: true, // Prevent admin from changing username via user settings
            createdAt: serverTimestamp(),
            feedbackScore: 100,
            positiveFeedback: 0,
            negativeFeedback: 0,
            avgPaymentTime: 0,
            avgReleaseTime: 0,
            accountAge: "0 days",
            photoURL: "",
            preferredCurrency: "USD",
            securityQuestion: "Admin account default",
            securityAnswer: "admin",
        });
        
        // Also update the auth profile's displayName if it doesn't match
        if (user.displayName !== adminId) {
           await updateProfile(user, { displayName: adminId });
        }
    }
}


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
    const adminEmail = `${values.adminId}@tradeflow.app`;

    try {
        await setPersistence(auth, browserLocalPersistence);
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, values.password);
        const { user } = userCredential;

        // Ensure the admin has a role document in /admins
        const adminRoleRef = doc(firestore, 'admins', user.uid);
        const adminRoleSnap = await getDoc(adminRoleRef);
        if (!adminRoleSnap.exists()) {
            await setDoc(adminRoleRef, { role: "admin", createdAt: serverTimestamp() });
        }
        
        // Ensure the admin has a user profile document in /users
        await ensureAdminProfileExists(firestore, user, values.adminId);
        
        toast({
            title: "Login Successful",
            description: "Redirecting to admin dashboard...",
        });
        router.push("/adminnarayan/dashboard");

    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                // If sign-in fails, attempt to create the admin account as a first-time setup.
                const newUserCredential = await createUserWithEmailAndPassword(auth, adminEmail, values.password);
                const { user: newUser } = newUserCredential;
                
                // Immediately create the admin role document for the new user.
                const adminRoleRef = doc(firestore, 'admins', newUser.uid);
                await setDoc(adminRoleRef, { role: "admin", createdAt: serverTimestamp() });
                
                // Also create the user profile document in /users
                await ensureAdminProfileExists(firestore, newUser, values.adminId);

                toast({
                    title: "Admin Account Created",
                    description: "First-time setup successful. Logging you in...",
                });
                router.push("/adminnarayan/dashboard");

            } catch (signUpError: any) {
                toast({
                    variant: "destructive",
                    title: "Admin Setup Failed",
                    description: signUpError.message,
                });
            }
        } else {
            toast({
              variant: "destructive",
              title: "Login Failed",
              description: error.message || "An unknown error occurred.",
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
