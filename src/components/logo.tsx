'use client';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useBranding } from '@/context/branding-context';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  const { branding } = useBranding();

  if (branding?.appLogo) {
    return <Image src={branding.appLogo} alt={APP_NAME} width={120} height={30} className={cn("object-contain h-[30px] w-auto", className)} />;
  }
  
  return (
    <div className={cn("text-2xl font-bold text-primary", className)}>
      {APP_NAME}
    </div>
  );
}