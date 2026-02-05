// This is a new file
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Flag } from "lucide-react";
import type { Trade } from "@/lib/types";
import { openDispute } from "@/lib/disputes";

const disputeSchema = z.object({
  reason: z.string().min(1, "Please select a reason for the dispute."),
  explanation: z.string().min(10, "Explanation must be at least 10 characters.").max(500, "Explanation cannot exceed 500 characters."),
});

type DisputeFormValues = z.infer<typeof disputeSchema>;

const disputeReasons = [
    "I have paid, but the seller has not released the crypto.",
    "Buyer has not paid, but marked the trade as paid.",
    "Buyer paid the wrong amount.",
    "The other party is unresponsive.",
    "I suspect fraudulent activity or a scam.",
    "Other (please explain in detail below).",
];


interface OpenDisputeDialogProps {
  trade: Trade;
  currentUserId: string;
  currentUsername: string;
}

export function OpenDisputeDialog({ trade, currentUserId, currentUsername }: OpenDisputeDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const form = useForm<DisputeFormValues>({
    resolver: zodResolver(disputeSchema),
    defaultValues: { reason: "", explanation: "" }
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: DisputeFormValues) {
    if (!firestore) return;

    try {
      await openDispute(
        firestore,
        trade,
        currentUserId,
        currentUsername,
        values.reason,
        values.explanation
      );
      toast({
        title: "Dispute Opened",
        description: "A moderator will join the chat shortly to assist you.",
      });
      setIsOpen(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Open Dispute", description: error.message });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full"><Flag className="mr-2 h-4 w-4" /> Open Dispute</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a Dispute for Trade {trade.tradeId}</DialogTitle>
          <DialogDescription>
            Please provide a clear reason for the dispute. A moderator will review all evidence.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {disputeReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explanation</FormLabel>
                  <FormControl>
                      <Textarea placeholder="Explain the situation clearly..." {...field} className="min-h-[100px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Dispute
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
