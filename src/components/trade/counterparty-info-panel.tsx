

'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DefaultAvatar } from '@/components/icons';
import { format, formatDistanceToNow } from 'date-fns';
import { toDate } from '@/lib/utils';
import type { User } from '@/lib/types';
import { Calendar, CheckCircle, ShieldBan, ShieldCheck, ThumbsDown, ThumbsUp, User as UserIcon, Users } from 'lucide-react';

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number | undefined }) {
    if (value === undefined || value === null) return null;
    return (
        <div className="flex items-center gap-3 py-2 border-b">
            <div className="text-muted-foreground">{icon}</div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium text-sm">{value}</p>
            </div>
        </div>
    );
}

interface CounterpartyInfoPanelProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CounterpartyInfoPanel({ user, open, onOpenChange }: CounterpartyInfoPanelProps) {
  if (!user) return null;
  
  const createdDate = toDate(user.createdAt);
  const lastActiveDate = toDate(user.lastActive);
  const dob = toDate(user.dob);
  
  const joinedAgo = createdDate ? formatDistanceToNow(createdDate) + ' ago' : 'N/A';
  const lastSeen = lastActiveDate ? formatDistanceToNow(lastActiveDate) + ' ago' : 'N/A';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Trader Information</SheetTitle>
          <SheetDescription>Details for {user.userId}</SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-6">
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-24 w-24 border-4 border-secondary">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback><DefaultAvatar /></AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{user.fullName}</h2>
             <p className="text-sm text-muted-foreground">@{user.userId}</p>
          </div>
          <div className="space-y-1">
             <DetailItem icon={<Calendar size={16} />} label="Date of Birth" value={dob ? format(dob, 'LLLL d, yyyy') : 'N/A'} />
             <DetailItem icon={<Calendar size={16} />} label="Joined" value={joinedAgo} />
             <DetailItem icon={<CheckCircle size={16} />} label="Completed Trades" value={user.completedTrades?.toLocaleString()} />
             <DetailItem icon={<ThumbsUp size={16} />} label="Positive Feedback" value={`${user.feedbackScore || 100}% (${user.positiveFeedback || 0})`} />
             <DetailItem icon={<ThumbsDown size={16} />} label="Negative Feedback" value={user.negativeFeedback || 0} />
             <DetailItem icon={<ShieldBan size={16} />} label="Users Blocked" value={user.blockedUsers?.length || 0} />
             <p className="text-xs text-muted-foreground pt-2">Information on how many users have blocked this trader is not available.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
