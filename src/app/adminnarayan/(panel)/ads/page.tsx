// This is a new file
"use client";

import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
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

export default function AdminAdsPage() {
  const { firestore } = useFirebase();

  const adsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "p2p_ads"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: ads, isLoading } = useCollection<P2PAd>(adsQuery);

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
