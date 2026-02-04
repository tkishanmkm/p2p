"use client";

import { useFirebase } from "@/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { P2PAd } from "@/lib/types";
import { cn, toDate } from "@/lib/utils";
import Link from "next/link";
import { useAdminStatus } from "@/hooks/use-admin-status";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminAdsPage() {
  const { firestore } = useFirebase();
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();
  const [ads, setAds] = useState<P2PAd[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isAdminLoading) return;
    if (!isAdmin || !firestore) {
      setIsLoading(false);
      return;
    }

    const fetchAds = async () => {
      setIsLoading(true);
      try {
        const adsRef = collection(firestore, "p2p_ads");
        const q = query(adsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setAds(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as P2PAd)));
      } catch (error) {
        console.error("Error fetching ads:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch ads." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAds();
  }, [isAdmin, isAdminLoading, firestore, toast]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">P2P Ads Management</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All User Ads</CardTitle>
          <CardDescription>
            View all ads on the platform, including active and inactive ones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading ads...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && ads?.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell className="font-mono text-xs">{ad.publicAdId}</TableCell>
                   <TableCell>
                     <Link href={`/users/${ad.user.userId}`} className="hover:underline font-medium">
                        {ad.user.userId}
                     </Link>
                   </TableCell>
                  <TableCell>
                    <Badge variant={ad.adType === "sell" ? "secondary" : "outline"} className="capitalize">
                      {ad.adType}
                    </Badge>
                  </TableCell>
                  <TableCell>{ad.crypto}/{ad.fiatCurrency}</TableCell>
                  <TableCell>
                    {ad.rateType === "fixed"
                      ? `${ad.fixedRate} ${ad.fiatCurrency}`
                      : `Market ${ad.ratePercent}%`}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        ad.active ? "text-green-600 border-green-500/50 bg-green-50" : "text-gray-600 border-gray-500/50 bg-gray-50"
                      )}
                    >
                      {ad.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{toDate(ad.createdAt)?.toLocaleString() ?? 'N/A'}</TableCell>
                </TableRow>
              ))}
              {!isLoading && !ads?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No ads found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
