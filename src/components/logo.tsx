import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("text-2xl font-bold text-primary", className)}>
      {APP_NAME}
    </div>
  );
}
