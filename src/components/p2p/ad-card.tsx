
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { P2PAd, User, UserWallet } from "@/lib/types";
import { usePrices } from "@/context/price-context";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { ThumbsUp, Info, Power } from "lucide-react";
import { toDate, cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from 'date-fns';
import { FlagIcon } from "../ui/flag-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface AdCardProps {
  ad: P2PAd;
}

export function AdCard({ ad }: AdCardProps) {
  const { firestore } = useFirebase();
  const { prices } = usePrices();

  // Fetch the ad creator's profile in real-time to get the latest avatar and stats
  const adCreatorRef = useMemoFirebase(() => (firestore ? doc(firestore, 'users', ad.userId) : null), [firestore, ad.userId]);
  const { data: adCreator, isLoading: isCreatorLoading } = useDoc<User>(adCreatorRef);

  const marketPrice = prices[ad.crypto] || 0;
  
  const adPrice = ad.rateType === 'fixed' 
    ? ad.fixedRate! 
    : marketPrice * (1 + (a