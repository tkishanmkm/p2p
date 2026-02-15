'use client';

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface DepositQRProps {
  address: string;
  qrCodeUrl: string;
  cryptoName: string;
}

export function DepositQR({ address, qrCodeUrl, cryptoName }: DepositQRProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit {cryptoName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Image src={qrCodeUrl} alt={`${cryptoName} QR Code`} width={200} height={200} />
        <div className="relative w-full">
            <Input value={address} readOnly />
            <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => navigator.clipboard.writeText(address)}>
                <Copy className="h-4 w-4"/>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
