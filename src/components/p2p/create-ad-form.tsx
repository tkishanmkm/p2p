"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { currencies } from "@/lib/currencies";
import { paymentMethods } from "@/lib/payment-methods";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

const adFormSchema = z.object({
  adType: z.enum(["buy", "sell"]),
  crypto: z.string().min(1, "Please select a cryptocurrency."),
  fiat: z.string().min(1, "Please select a fiat currency."),
  paymentMethod: z.string().min(1, "Please select or enter a payment method."),
  isCustomPayment: z.boolean(),
  rateType: z.enum(["market", "fixed"]),
  ratePercent: z.number().optional(),
  fixedRate: z.number().optional(),
  minAmount: z.number().min(1, "Minimum amount is required."),
  maxAmount: z.number().min(1, "Maximum amount is required."),
  terms: z.string().min(10, "Terms must be at least 10 characters.").max(500, "Terms cannot exceed 500 characters."),
}).refine(data => data.maxAmount >= data.minAmount, {
    message: "Max amount must be greater than or equal to min amount.",
    path: ["maxAmount"],
});

type AdFormValues = z.infer<typeof adFormSchema>;

export function CreateAdForm() {
  const { toast } = useToast();

  const form = useForm<AdFormValues>({
    resolver: zodResolver(adFormSchema),
    defaultValues: {
      adType: "sell",
      crypto: "btc",
      fiat: "usd",
      isCustomPayment: false,
      rateType: "market",
      ratePercent: 1.5,
    },
  });

  const watchRateType = form.watch("rateType");
  const watchIsCustomPayment = form.watch("isCustomPayment");

  const cryptoOptions = SUPPORTED_CRYPTOS.map((c) => ({ value: c.name.toLowerCase(), label: c.name }));
  const fiatOptions = currencies.map((c) => ({ value: c.toLowerCase(), label: c }));
  const paymentMethodOptions = paymentMethods.map((pm) => ({ value: pm.toLowerCase().replace(/\s/g, '_'), label: pm }));

  function onSubmit(data: AdFormValues) {
    console.log(data);
    toast({ title: "Ad Created", description: "Your ad has been successfully created." });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a P2P Advertisement</CardTitle>
        <CardDescription>
          Set up your ad to buy or sell crypto. It will be visible to other users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="adType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>I want to</FormLabel>
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={field.onChange}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="sell">Sell</TabsTrigger>
                        <TabsTrigger value="buy">Buy</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="crypto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cryptocurrency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a crypto" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cryptoOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fiat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>With Fiat</FormLabel>
                    <Combobox options={fiatOptions} value={field.value} onChange={field.onChange} placeholder="Select fiat currency" />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
                control={form.control}
                name="isCustomPayment"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Payment Method</FormLabel>
                            <FormDescription>Use a standard or custom payment method.</FormDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="custom-payment-switch">Custom</Label>
                            <FormControl>
                                <Switch
                                    id="custom-payment-switch"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </div>
                    </FormItem>
                )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    {watchIsCustomPayment ? (
                        <Input placeholder="e.g., My Local Bank" {...field} />
                    ) : (
                        <Combobox options={paymentMethodOptions} value={field.value} onChange={field.onChange} placeholder="Select payment method" />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rateType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Pricing</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col md:flex-row gap-4"
                    >
                      <FormItem className="flex-1 flex items-center space-x-3 space-y-0 border p-4 rounded-md has-[:checked]:border-primary">
                        <FormControl><RadioGroupItem value="market" /></FormControl>
                        <FormLabel className="font-normal w-full">Market Rate</FormLabel>
                      </FormItem>
                      <FormItem className="flex-1 flex items-center space-x-3 space-y-0 border p-4 rounded-md has-[:checked]:border-primary">
                        <FormControl><RadioGroupItem value="fixed" /></FormControl>
                        <FormLabel className="font-normal w-full">Fixed Rate</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchRateType === "market" ? (
              <FormField
                control={form.control}
                name="ratePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Rate Adjustment</FormLabel>
                    <div className="relative">
                      <Input type="number" step="0.01" placeholder="1.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                    <FormDescription>Percentage above or below market rate. Use negative for below.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="fixedRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fixed Price per Crypto</FormLabel>
                    <Input type="number" step="any" placeholder="65000.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    <FormDescription>The fixed price in your selected fiat currency.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="minAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Trade Amount</FormLabel>
                    <Input type="number" placeholder="100" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    <FormDescription>In your selected fiat currency.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Trade Amount</FormLabel>
                    <Input type="number" placeholder="5000" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    <FormDescription>In your selected fiat currency.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Payment must be made from an account with your name. No third-party payments..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" className="w-full md:w-auto">Create Ad</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
