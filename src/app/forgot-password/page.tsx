// This is a new file
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
import { Logo } from "@/components/logo";
import { useFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, CalendarIcon } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { User } from "@/lib/types";

const formSchema = z.object({
  userId: z.string().min(1, { message: "User ID is required." }),
  fullName: z.string().min(2, { message: "Full name is required." }),
  dob: z.date({
    required_error: "Your date of birth is required for verification.",
  }),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      fullName: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
      toast({ variant: "destructive", title: "Error", description: "Database service not ready."});
      return;
    }
    setIsLoading(true);

    try {
      const usersRef = collection(firestore, "users");
      const q = query(
        usersRef,
        where("userId", "==", values.userId),
        where("fullName", "==", values.fullName),
        where("dob", "==", values.dob.toISOString().split('T')[0])
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "The information you provided does not match our records.",
        });
      } else {
        const userDoc = querySnapshot.docs[0].data() as User;
        if (!userDoc.securityQuestion) {
            toast({
                variant: "destructive",
                title: "Account Recovery Not Set Up",
                description: "This account does not have security questions configured.",
            });
            return;
        }
        toast({
          title: "Verification Successful",
          description: "Please answer your security question to proceed.",
        });
        const queryParams = new URLSearchParams({
            userId: userDoc.id, // Pass internal UID
            question: userDoc.securityQuestion,
        }).toString();
        router.push(`/reset-password?${queryParams}`);
      }
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
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
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your details to recover your account.
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
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Verifying..." : "Verify Account"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Log In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
