"use client";

import { useForm } from "react-hook-form";
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
import { useFirebase, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import type { User, P2PAd, CryptoCurrency } from "@/lib/types";
import { createP2PAd } from "@/lib/ads";
import { useRouter } from "next/navigation";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { usePrices } from "@/context/price-context";

const adTags = [
  { id: "no-third-party", label: "No third party" },
  { id: "no-receipt-required", label: "No receipt required" },
  { id: "no-verification", label: "No verification" },
  { id: "invoice-accepted", label: "Invoice accepted" },
];

const adFormSchema = z.object({
  adType: z.enum(["buy", "sell"]),
  crypto: z.string().min(1, "Please select a cryptocurrency."),
  fiatCurrency: z.string().min(1, "Please select a fiat currency."),
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method."),
  rateType: z.enum(["market", "fixed"]),
  ratePercent: z.coerce.number().min(-50, "Value must be >= -50").max(50, "Value must be <= 50").optional(),
  fixedRate: z.coerce.number().optional(),
  minAmount: z.coerce.number().min(1, "Minimum amount is required."),
  maxAmount: z.coerce.number().min(1, "Maximum amount is required."),
  terms: z.string().min(10, "Terms must be at least 10 characters.").max(500, "Terms cannot exceed 500 characters."),
  tags: z.array(z.string()).optional(),
}).refine(data => {
    if (data.rateType === 'market') {
        return data.ratePercent !== undefined && data.ratePercent !== null;
    }
    return true;
}, {
    message: "Market rate adjustment is required.",
    path: ["ratePercent"],
}).refine(data => {
    if (data.rateType === 'fixed') {
        return data.fixedRate !== undefined && data.fixedRate !== null && data.fixedRate > 0;
    }
    return true;
}, {
    message: "Fixed rate is required and must be positive.",
    path: ["fixedRate"],
}).refine(data => data.maxAmount >= data.minAmount, {
    message: "Max amount must be greater than or equal to min amount.",
    path: ["maxAmount"],
});

type AdFormValues = z.infer<typeof adFormSchema>;

export function CreateAdForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { firestore, user } = useFirebase();
  const { prices, isLoading: arePricesLoading } = usePrices();

  const userRef = user ? doc(firestore, "users", user.uid) : null;
  const { data: userData } = useDoc<User>(userRef);

  const form = useForm<AdFormValues>({
    resolver: zodResolver(adFormSchema),
    defaultValues: {
      adType: "sell",
      crypto: "BTC",
      fiatCurrency: "USD",
      paymentMethods: [],
      rateType: "market",
      ratePercent: 1.5,
      tags: [],
    },
  });

  const watchRateType = form.watch("rateType");
  const watchPaymentMethods = form.watch("paymentMethods");
  const watchCrypto = form.watch("crypto") as CryptoCurrency;
  const watchFiat = form.watch("fiatCurrency");

  const currentMarketPrice = prices[watchCrypto] || 0;

  const cryptoOptions = SUPPORTED_CRYPTOS.map((c) => ({ value: c.name, label: c.name }));
  const fiatOptions = currencies.map((c) => ({ value: c, label: c }));
  const paymentMethodOptions = paymentMethods.map((pm) => ({ value: pm, label: pm }));

  async function onSubmit(data: AdFormValues) {
    if (!firestore || !user || !userData) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to create an ad." });
        return;
    }

    const adData: Omit<P2PAd, 'id' | 'createdAt' | 'user' | 'userId'> = {
        adType: data.adType,
        crypto: data.crypto as CryptoCurrency,
        fiatCurrency: data.fiatCurrency,
        paymentMethods: data.paymentMethods,
        rateType: data.rateType,
        ratePercent: data.rateType === 'market' ? data.ratePercent : undefined,
        fixedRate: data.rateType === 'fixed' ? data.fixedRate : undefined,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        terms: data.terms,
        tags: data.tags,
        active: true,
    };
    
    try {
        await createP2PAd(firestore, adData, {
            id: user.uid,
            userId: userData.userId,
            feedbackScore: userData.feedbackScore,
            completedTrades: userData.completedTrades,
            photoURL: userData.photoURL
        });
        toast({ title: "Ad Created", description: "Your ad has been successfully posted." });
        router.push(data.adType === 'sell' ? '/buy' : '/sell');
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Failed to create ad", description: "An error occurred." });
    }
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
                name="fiatCurrency"
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
              name="paymentMethods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Methods</FormLabel>
                   <Combobox options={paymentMethodOptions} value={watchPaymentMethods.join(', ')} onChange={(val) => form.setValue('paymentMethods', [...watchPaymentMethods, val])} placeholder="Select payment methods" />
                  <FormDescription>You can select multiple payment methods.</FormDescription>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {watchPaymentMethods.map((pm, index) => (
                      <Badge key={index} variant="secondary">
                        {pm}
                        <button type="button" onClick={() => {
                            const updatedPms = [...watchPaymentMethods];
                            updatedPms.splice(index, 1);
                            form.setValue('paymentMethods', updatedPms);
                        }} className="ml-2 rounded-full hover:bg-destructive/50 p-0.5">&times;</button>
                      </Badge>
                    ))}
                  </div>
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
                      <Input type="number" step="0.01" placeholder="e.g. 1.5 or -2.0" {...field} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                    <FormDescription>Enter a positive value to sell above market price, or a negative value to sell below. (Range: -50% to +50%)</FormDescription>
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
                    <Input 
                      type="number" 
                      step="any" 
                      placeholder={arePricesLoading ? "Loading..." : `${currentMarketPrice.toLocaleString()}`} 
                      {...field} 
                    />
                    <FormDescription>The fixed price in {watchFiat}. Current market price is approx. {currentMarketPrice.toLocaleString()} USD.</FormDescription>
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
                    <Input type="number" placeholder="100" {...field} />
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
                    <Input type="number" placeholder="5000" {...field} />
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
            
            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Ad Tags</FormLabel>
                    <FormDescription>Select tags that apply to your ad.</FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                  {adTags.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="tags"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.label)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), item.label])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== item.label
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {item.label}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                  </div>
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
