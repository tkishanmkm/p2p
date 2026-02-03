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
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ADMIN_ID, ADMIN_PASS } from "@/lib/constants";

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
    const adminEmail = `${values.adminId}@tradeflow.app`;

    try {
      await signInWithEmailAndPassword(auth, adminEmail, values.password);
      
      toast({
        title: "Login Successful",
        description: "Redirecting to admin dashboard...",
      });
      router.push("/adminnarayan/dashboard");

    } catch (error: any) {
      // If user not found, try to create them, but only if credentials match the constants.
      if (error.code === 'auth/user-not-found' && values.adminId === ADMIN_ID && values.password === ADMIN_PASS) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, values.password);
          
          // IMPORTANT: Create the admin role document in Firestore to grant admin privileges
          const adminRoleRef = doc(firestore, 'roles_admin', userCredential.user.uid);
          // The content doesn't matter for the security rules, only the document's existence.
          await setDoc(adminRoleRef, { role: "admin", createdAt: serverTimestamp() });

          toast({
            title: "Admin Account Created",
            description: "First-time setup successful. Logging you in...",
          });
          // No need to call signIn again, createUserWithEmailAndPassword signs the user in.
          router.push("/adminnarayan/dashboard");

        } catch (signUpError: any) {
          toast({
            variant: "destructive",
            title: "Admin Setup Failed",
            description: "Could not create the admin user account. " + signUpError.message,
          });
        }
      } else {
        // Handle other login errors (wrong password, etc.) as before
        let description = "An unknown error occurred.";
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          description = "Invalid Admin ID or Password.";
        } else if (error.code === 'auth/too-many-requests') {
          description = "Too many failed login attempts. Please try again later.";
        }
        toast({
          variant: "destructive",
          title: "Login Failed",
          description,
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
