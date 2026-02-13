
'use client';

import { useState } from 'react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc } from 'firebase/firestore';
import type { Trade } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export function FeedbackForm({ trade }: { trade: Trade }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating || !comment.trim() || !firestore || !user || !user.displayName) {
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
            // For simplicity, we'll just disable the form after submission
            setIsSubmitting(true); 
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit feedback.' });
            setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold text-center text-sm text-foreground">Leave Feedback</h4>
            <RadioGroup onValueChange={(v) => setRating(v as any)} value={rating || ''} className="flex gap-4 justify-center">
                <Label htmlFor="rating-positive" className="flex items-center gap-2 cursor-pointer p-2 border rounded-md has-[:checked]:border-green-500 has-[:checked]:bg-green-100">
                    <RadioGroupItem value="positive" id="rating-positive" />
                    <ThumbsUp className="h-5 w-5 text-green-600" /> Positive
                </Label>
                <Label htmlFor="rating-negative" className="flex items-center gap-2 cursor-pointer p-2 border rounded-md has-[:checked]:border-red-500 has-[:checked]:bg-red-100">
                    <RadioGroupItem value="negative" id="rating-negative" />
                    <ThumbsDown className="h-5 w-5 text-red-600" /> Negative
                </Label>
            </RadioGroup>
            <Textarea 
                placeholder="Leave a comment about your trading experience..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
            <Button type="submit" size="sm" className="w-full" disabled={isSubmitting || !rating || !comment}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Feedback
            </Button>
        </form>
    );
}
