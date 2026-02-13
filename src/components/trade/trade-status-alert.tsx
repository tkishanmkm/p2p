
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trade } from "@/lib/types";
import { CheckCircle, Flag, RotateCcw, ThumbsUp, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { FeedbackForm } from './feedback-form';


interface TradeStatusAlertProps {
  trade: Trade;
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
                        <p className="text-sm text-green-700">Congratulations! The trade was successful. Coin has been released by seller.</p>
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
                        <p className="text-sm text-red-700">The buyer has cancelled this trade. Do not send any payment. If you have already paid, please reopen the trade.</p>
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
                        <p className="text-sm text-gray-700">The payment window for this trade has expired. Please do not send any payment. If you have already paid, please open a new trade from the ad page.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
  }

  return null;
}
