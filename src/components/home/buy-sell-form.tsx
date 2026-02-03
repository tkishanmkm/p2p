"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BtcLogo } from '@/components/icons';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export function BuySellForm() {
  return (
    <Card className="bg-secondary/60 border-none shadow-lg rounded-xl">
        <CardContent className="p-6">
            <Tabs defaultValue="buy" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted p-1">
                    <TabsTrigger value="buy">I want to buy</TabsTrigger>
                    <TabsTrigger value="sell">I want to sell</TabsTrigger>
                </TabsList>
                <TabsContent value="buy">
                    <FormContent />
                </TabsContent>
                 <TabsContent value="sell">
                    <FormContent />
                </TabsContent>
            </Tabs>
      </CardContent>
    </Card>
  );
}

function FormContent() {
  return (
    <form className="space-y-4 pt-6">
        <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">All crypto</Label>
            <Select defaultValue="btc">
                <SelectTrigger className="bg-white h-12 text-base">
                    <SelectValue>
                        <div className="flex items-center gap-2">
                            <BtcLogo className="h-6 w-6" />
                            <span className="font-medium">BTC</span>
                        </div>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="btc">
                         <div className="flex items-center gap-2">
                            <BtcLogo className="h-6 w-6" />
                            <span className="font-medium">BTC</span>
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
             <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">I have</Label>
                <Input placeholder="Amount" className="bg-white h-12" />
             </div>
             <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Payment method</Label>
                <Input placeholder="e.g. Bank transfer" className="bg-white h-12" />
             </div>
        </div>

        <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Amount (USD)</Label>
            <Input placeholder="Enter amount" className="bg-white h-12" />
        </div>
      
      <div>
        <Button type="submit" className="w-full h-12 text-base font-semibold" size="lg">
          <Search className="mr-2 h-5 w-5" />
          Search
        </Button>
      </div>
    </form>
  );
}
