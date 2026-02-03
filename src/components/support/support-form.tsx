
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirebase } from "@/firebase"
import { useEffect, useState } from "react"
import { createSupportTicket } from "@/lib/support"
import { Loader2 } from "lucide-react"

const supportFormSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email("Invalid email address."),
  message: z.string().min(20, "Message must be at least 20 characters long.").max(1000, "Message cannot exceed 1000 characters."),
})

export function SupportForm() {
    const { toast } = useToast()
    const { firestore, user } = useFirebase();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof supportFormSchema>>({
      resolver: zodResolver(supportFormSchema),
      defaultValues: {
        userId: "",
        email: "",
        message: "",
      },
    })

    useEffect(() => {
      if (user) {
        form.setValue('userId', user.displayName || '');
        form.setValue('email', user.email || '');
      }
    }, [user, form]);

  async function onSubmit(values: z.infer<typeof supportFormSchema>) {
    if (!firestore) {
      toast({ variant: "destructive", title: "Error", description: "Database connection not available."});
      return;
    }
    setIsSubmitting(true);
    try {
      await createSupportTicket(firestore, values);
      toast({
          title: "Support Ticket Submitted",
          description: "Our team will get back to you shortly.",
      })
      form.reset()
    } catch(error: any) {
       toast({ variant: "destructive", title: "Submission Failed", description: "Could not submit your ticket. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Support</CardTitle>
        <CardDescription>
          Have an issue or a question? Fill out the form below and we'll get back to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your User ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="YourUniqueUserID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe your issue in detail..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Please provide any relevant information like Trade IDs, transaction details, etc.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Ticket
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
