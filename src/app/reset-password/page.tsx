"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
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
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

function ResetPasswordComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { auth } = useFirebase();
  const { toast } = useToast();
  
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const code = searchParams.get('oobCode');
    if (!code || !auth) {
      setError("Invalid password reset link. Please try again.");
      setIsLoading(false);
      return;
    }
    
    setOobCode(code);
    verifyPasswordResetCode(auth, code)
      .then(() => {
        setIsLoading(false);
      })
      .catch(err => {
        setError("Your password reset link is invalid or has expired. Please request a new one.");
        setIsLoading(false);
      });
  }, [searchParams, auth]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !oobCode) return;
    setIsSubmitting(true);

    try {
      await confirmPasswordReset(auth, oobCode, values.password);
      toast({
        title: "Password Reset Successful",
        description: "You can now log in with your new password.",
      });
      router.push('/login');
    } catch (error: any) {
      setError("An error occurred. Your link may have expired.");
      setIsSubmitting(false);
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
    }
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="password"
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password
          </Button>
        </form>
      </Form>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-secondary/50">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              Enter a new password for your account below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
            <div className="mt-6 text-center text-sm">
              <Link href="/login" className="font-medium text-accent hover:underline">
                Back to Log In
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ResetPasswordComponent />
        </Suspense>
    )
}

    