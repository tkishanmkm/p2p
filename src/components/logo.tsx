import { HandCoins } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-xl font-bold text-accent", className)}>
      <HandCoins className="h-6 w-6" />
      <span className='text-foreground'>{APP_NAME}</span>
    </div>
  );
}
