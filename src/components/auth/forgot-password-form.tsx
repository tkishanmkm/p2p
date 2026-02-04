"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Step 1: Find user by ID
const findUserSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
});

// Step 2: Verify answer and set new password
const resetPasswordSchema = z.object({
  securityAnswer: z.string().min(1, "Security answer is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

type FindUserValues = z.infer<typeof findUserSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ForgotPasswordForm() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userDoc, setUserDoc] = useState<User | null>(null);

  const findUserForm = useForm<FindUserValues>({
    resolver: zodResolver(findUserSchema),
  });

  const resetPasswordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const handleFindUser = async (values: FindUserValues) => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("userId", "==", values.userId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        findUserForm.setError("userId", {
          type: "manual",
          message: "No user found with this ID.",
        });
      } else {
        const doc = querySnapshot.docs[0];
        setUserDoc({ id: doc.id, ...doc.data() } as User);
        setStep(2);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to search for user." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = (values: ResetPasswordValues) => {
    if (!userDoc) return;
    setIsLoading(true);

    if (values.securityAnswer.toLowerCase() !== userDoc.securityAnswer?.toLowerCase()) {
      resetPasswordForm.setError("securityAnswer", {
        type: "manual",
        message: "The security answer is incorrect.",
      });
      setIsLoading(false);
      return;
    }

    // This is where the actual password reset would happen.
    // As we cannot do this securely from the client-side without the user being logged in,
    // we will simulate success and inform the user of the limitation.
    toast({
        title: "Security Answer Verified!",
        description: "In a real app, your password would now be reset. This requires a backend function which is not available in this environment.",
        duration: 10000,
    });
    
    // In a real implementation with a backend, you'd call a Cloud Function here:
    // e.g., const reset = httpsCallable(functions, 'resetPassword');
    // await reset({ userId: userDoc.id, newPassword: values.newPassword });

    setIsLoading(false);
    setStep(3); // Go to a "success" step
  };
  
  if (step === 3) {
    return (
        <Alert>
            <AlertTitle>Password Reset Simulated</AlertTitle>
            <AlertDescription>
                Your security question was answered correctly. The password reset process has been simulated successfully.
            </AlertDescription>
        </Alert>
    );
  }

  if (step === 2 && userDoc) {
    return (
      <Form {...resetPasswordForm}>
        <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Security Question:</p>
            <p className="p-3 bg-secondary rounded-md text-sm">{userDoc.securityQuestion}</p>
          </div>
          <FormField
            control={resetPasswordForm.control}
            name="securityAnswer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Answer</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your answer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={resetPasswordForm.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter a new strong password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <Form {...findUserForm}>
      <form onSubmit={findUserForm.handleSubmit(handleFindUser)} className="space-y-6">
        <FormField
          control={findUserForm.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter your User ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Find Account
        </Button>
      </form>
    </Form>
  );
}
