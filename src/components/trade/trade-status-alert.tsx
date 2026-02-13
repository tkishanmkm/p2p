
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trade } from "@/lib/types";
import { CheckCircle, Flag, RotateCcw, ThumbsUp, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface TradeStatusAlertProps {
  trade: Trade;
}

const FeedbackForm = ({ trade }: { trade: Trade }) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating || !comment.trim() || !firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a rating and write a comment.' });
            return;
        }

        setIsSubmitting(true);
        const opponentId = user.uid === trade.buyerId ? trade.sellerId : trade.buyerId;

        try {
            const feedbackRef = collection(firestore, 'trades', trade.id, 'feedback');
            await addDoc(feedbackRef, {
                tradeId: trade.id,
                fromUser: user.uid,
                fromUsername: user.displayName,
                toUser: opponentId,
                rating,
                comment,
                createdAt: new Date().toISOString(),
            });
            toast({ title: 'Feedback Submitted', description: 'Thank you for your feedback!' });
            // Here you'd ideally mark the trade as "feedback_left" to hide the form
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit feedback.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <RadioGroup onValueChange={(v) => setRating(v as any)} value={rating || ''} className="flex gap-4">
                <Label htmlFor="rating-positive" className="flex items-center gap-2 cursor-pointer p-2 border rounded-md has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                    <RadioGroupItem value="positive" id="rating-positive" />
                    <ThumbsUp className="h-5 w-5 text-green-600" /> Positive
                </Label>
                <Label htmlFor="rating-negative" className="flex items-center gap-2 cursor-pointer p-2 border rounded-md has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                    <RadioGroupItem value="negative" id="rating-negative" />
                    <ThumbsDown className="h-5 w-5 text-red-600" /> Negative
                </Label>
            </RadioGroup>
            <Textarea 
                placeholder="Leave a comment about your trading experience..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={isSubmitting}>Submit Feedback</Button>
        </form>
    );
}

export function TradeStatusAlert({ trade }: TradeStatusAlertProps) {
  if (trade.status === 'active' || trade.status === 'paid' || trade.status === 'disputed') {
    return null;
  }
  
  const finalStatus = trade.status;
  
  if (finalStatus === 'released') {
    return (
        <Card className="mt-4 border-green-500 bg-green-50">
            <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-600"/>
                    <div>
                        <h3 className="font-bold text-green-800">Trade Completed</h3>
                        <p className="text-sm text-green-700">Congratulations! The trade was successful.</p>
                    </div>
                </div>
                <FeedbackForm trade={trade} />
            </CardContent>
        </Card>
    )
  }

  if (finalStatus === 'cancelled') {
    return (
        <Card className="mt-4 border-red-500 bg-red-50">
            <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-600"/>
                    <div>
                        <h3 className="font-bold text-red-800">Trade Cancelled</h3>
                        <p className="text-sm text-red-700">The buyer has cancelled this trade. Do not send any payment.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
  }

  if (finalStatus === 'expired') {
     return (
        <Card className="mt-4 border-gray-400 bg-gray-50">
            <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-gray-600"/>
                    <div>
                        <h3 className="font-bold text-gray-800">Trade Expired</h3>
                        <p className="text-sm text-gray-700">The payment window for this trade has expired. Please do not send any payment.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
  }

  return null;
}
