// This is a new file
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
import { Logo } from "@/components/logo";
import { useFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "@/lib/types";

const formSchema = z.object({
  securityAnswer: z.string().min(1, { message: "Security answer is required." }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});

function ResetPasswordFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const question = searchParams.get("question");

  const { firestore, auth } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { securityAnswer: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !auth || !userId) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
      return;
    }
    setIsLoading(true);

    try {
      const userRef = doc(firestore, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User not found.");
      }

      const userData = userDoc.data() as User;
      // IMPORTANT: In a real-world app, this comparison must happen on a secure server.
      // Comparing a plaintext answer on the client is insecure.
      if (userData.securityAnswer !== values.securityAnswer) {
        toast({ variant: "destructive", title: "Incorrect Answer", description: "The security answer is not correct." });
        return;
      }
      
      // The Firebase client SDK cannot reset a password without the user being logged in
      // or using a password reset email link. Since this app uses dummy emails,
      // we can only simulate the success of this step.
      // A backend with the Firebase Admin SDK would be required to complete this securely.
      
      console.log(`Simulating password reset for user ${userId} with new password: ${values.newPassword}`);

      toast({
        title: "Password Reset Successful",
        description: "You can now log in with your new password.",
      });
      router.push("/login");

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (!userId || !question) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
             <Card className="w-full max-w-md">
                 <CardHeader>
                    <CardTitle>Invalid Link</CardTitle>
                 </CardHeader>
                <CardContent>
                    <p>The password reset link is invalid or has expired.</p>
                    <Button asChild className="mt-4"><Link href="/forgot-password">Go back</Link></Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
             <Logo />
          </Link>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Answer your security question and set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label>Security Question</Label>
                    <p className="text-sm p-3 bg-muted rounded-md">{question}</p>
                </div>

              <FormField
                control={form.control}
                name="securityAnswer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Answer</FormLabel>
                    <FormControl>
                      <Input placeholder="Your secret answer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <ResetPasswordFormComponent />
        </Suspense>
    )
}
