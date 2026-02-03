"use client"

import { cn } from "@/lib/utils"
import type { TradeStatus } from "@/lib/types"
import { Check, Loader, Circle, X, Flag, Hourglass } from "lucide-react"

interface StepperProps {
  currentStatus: TradeStatus
  tradeType: 'buy' | 'sell'
}

export function TradeStatusStepper({ currentStatus, tradeType }: StepperProps) {
  const buyerSteps = [
    { name: "Pay Seller", status: 'active' },
    { name: "Wait for Confirmation", status: 'paid' },
    { name: "Crypto Released", status: 'released' },
  ]

  const sellerSteps = [
    { name: "Wait for Payment", status: 'active' },
    { name: "Confirm Payment", status: 'paid' },
    { name: "Crypto Released", status: 'released' },
  ]

  const steps = tradeType === 'buy' ? buyerSteps : sellerSteps
  
  const statusMap: Record<TradeStatus, { index: number; final: boolean; icon: React.ReactNode; color: string }> = {
    active: { index: 0, final: false, icon: <Loader className="animate-spin" />, color: 'text-blue-500' },
    paid: { index: 1, final: false, icon: <Loader className="animate-spin" />, color: 'text-blue-500' },
    released: { index: 2, final: true, icon: <Check />, color: 'text-green-500' },
    cancelled: { index: -1, final: true, icon: <X />, color: 'text-gray-500' },
    disputed: { index: -1, final: true, icon: <Flag />, color: 'text-red-500' },
    expired: { index: -1, final:true, icon: <Hourglass />, color: 'text-yellow-500' },
  }
  
  const currentStepInfo = statusMap[currentStatus];
  
  if (currentStepInfo.index === -1) {
    return (
      <div className={cn("flex items-center gap-2 p-4 rounded-lg bg-secondary", currentStepInfo.color)}>
        {currentStepInfo.icon}
        <span className="font-semibold capitalize">{currentStatus}</span>
      </div>
    )
  }

  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li
            key={step.name}
            className={cn('relative', stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : '')}
          >
            {currentStepInfo.index > stepIdx ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-5 w-5" />
                  <span className="sr-only">{step.name}</span>
                </div>
              </>
            ) : currentStepInfo.index === stepIdx ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" aria-hidden="true" />
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-background">
                   <Circle className="h-2.5 w-2.5 text-gray-300" />
                </div>
              </>
            )}
            <div className="absolute -bottom-6 w-max text-center sm:w-auto sm:bottom-auto sm:top-10 sm:left-1/2 sm:-translate-x-1/2">
                <span className={cn("text-xs text-muted-foreground", currentStepInfo.index >= stepIdx && "font-semibold text-foreground")}>{step.name}</span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
