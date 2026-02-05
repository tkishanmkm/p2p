
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
import { paymentMethods, giftCardPaymentMethods } from "@/lib/payment-methods";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import type { User, P2PAd, CryptoCurrency, UserWallet } from "@/lib/types";
import { createP2PAd, updateAd } from "@/lib/ads";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { usePrices } from "@/context/price-context";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wallet } from "lucide-react";

const adTags = [
  { id: "no-third-party", label: "No third party" },
  { id: "no-receipt-required", label: "No receipt required" },
  { id: "no-verification", label: "No verification" },
  { id: "invoice-accepted", label: "Invoice accepted" },
];

const adFormSchema = z.object({
  adType: z.enum(["buy", "sell"]),
  crypto: z.string().min(1, "Please select a coin."),
  fiatCurrency: z.string().min(1, "Please select a fiat currency."),
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method.").max(5, "You can select up to 5 payment methods."),
  rateType: z.enum(["market", "fixed"]),
  ratePercent: z.coerce.number({
        invalid_type_error: "A valid percentage is required.",
    })
    .min(-50, { message: "Please enter a value from -50 to 50." })
    .max(50, { message: "Please enter a value from -50 to 50." })
    .optional(),
  fixedRate: z.coerce.number({invalid_type_error: "A valid number is required."}).positive({message: "Fixed rate must be a positive number."}).optional(),
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
        return data.fixedRate !== undefined && data.fixedRate !== null;
    }
    return true;
}, {
    message: "Fixed rate is required.",
    path: ["fixedRate"],
}).refine(data => data.maxAmount >= data.minAmount, {
    message: "Max amount must be greater than or equal to min amount.",
    path: ["maxAmount"],
});

type AdFormValues = z.infer<typeof adFormSchema>;

interface CreateAdFormProps {
    ad?: P2PAd;
    isAdmin?: boolean;
}

export function CreateAdForm({ ad, isAdmin = false }: CreateAdFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { firestore, user } = useFirebase();
  const { prices, isLoading: arePricesLoading } = usePrices();
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');

  const adCreatorId = ad?.userId || user?.uid;

  const userRef = adCreatorId ? doc(firestore, "users", adCreatorId) : null;
  const { data: userData } = useDoc<User>(userRef);

  const walletsRef = useMemoFirebase(() => adCreatorId ? collection(firestore, 'users', adCreatorId, 'wallets') : null, [adCreatorId, firestore]);
  const { data: wallets } = useCollection<UserWallet>(walletsRef);

  const form = useForm<AdFormValues>({
    resolver: zodResolver(adFormSchema),
    shouldUnregister: false, // Keep values in state when conditional fields are unmounted
    defaultValues: ad 
      ? { ...ad, ratePercent: ad.ratePercent ?? 5 } 
      : {
          adType: "sell",
          crypto: "BTC",
          fiatCurrency: "USD",
          paymentMethods: [],
          rateType: "market",
          ratePercent: 5,
          // IMPORTANT: Do NOT set a default for fixedRate here. Let it be undefined.
          tags: [],
        },
  });
  
  const watchedRateType = form.watch("rateType");
  const watchedCrypto = form.watch("crypto");
  const currentMarketPrice = prices[watchedCrypto as CryptoCurrency] || 0;
  
  // This single effect now manages the logic for setting default pricing values.
  useEffect(() => {
    // Only proceed if we have a valid market price to work with.
    if (currentMarketPrice <= 0) return;

    // Logic for when the user switches to 'Fixed' rate type.
    if (watchedRateType === 'fixed') {
        const currentFixedRate = form.getValues('fixedRate');
        // If the fixed rate field is empty/undefined (i.e., user hasn't set it),
        // then pre-fill it with the current market price.
        // This preserves any value the user might have entered previously.
        if (currentFixedRate === undefined || currentFixedRate === null) {
            form.setValue('fixedRate', parseFloat(currentMarketPrice.toFixed(2)));
        }
    }
  }, [watchedRateType, watchedCrypto, currentMarketPrice, form]);

  useEffect(() => {
    setBalanceError(null);
    const watchedFields = form.getValues();
    if (watchedFields.adType !== 'sell' || !watchedFields.maxAmount || !wallets || !watchedFields.crypto) {
        return;
    }

    const selectedWallet = wallets.find(w => w.crypto === watchedFields.crypto);
    const userBalance = selectedWallet?.balance ?? 0;
    
    const price = watchedFields.rateType === 'fixed' 
      ? watchedFields.fixedRate ?? 0
      : currentMarketPrice > 0 ? currentMarketPrice * (1 + (watchedFields.ratePercent ?? 0) / 100) : 0;

    if (price <= 0) return;
    
    const requiredCrypto = watchedFields.maxAmount / price;
    
    if (userBalance < requiredCrypto) {
      setBalanceError(`Insufficient ${watchedFields.crypto} balance. You need at least ${requiredCrypto.toFixed(6)} ${watchedFields.crypto} to cover the maximum amount, but you only have ${userBalance.toFixed(6)} available.`);
    }

  }, [form.watch(), wallets, currentMarketPrice]);


  const cryptoOptions = SUPPORTED_CRYPTOS.map((c) => ({ value: c.name, label: c.name }));
  const fiatOptions = currencies.map((c) => ({ value: c, label: c }));
  const paymentMethodOptions = paymentMethods.map((pm) => ({ value: pm, label: pm }));
  const giftCardOptions = giftCardPaymentMethods.map((pm) => ({ value: pm, label: pm }));
  
  const addPaymentMethod = (method: string) => {
    if (!method) return;
    const currentMethods = form.getValues('paymentMethods') || [];
    if (currentMethods.length >= 5) {
        toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can only add up to 5 payment methods.' });
        return;
    }
    if (currentMethods.map(c => c.toLowerCase()).includes(method.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Duplicate', description: 'This payment method has already been added.' });
        return;
    }
    form.setValue('paymentMethods', [...currentMethods, method]);
  };

  async function onSubmit(data: AdFormValues) {
    if (!firestore || !user || !userData) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
        return;
    }
    if (balanceError && !isAdmin) {
        toast({ variant: "destructive", title: "Cannot Create Ad", description: "Please resolve the balance issue first." });
        return;
    }
    
    const adData: Omit<P2PAd, 'id' | 'createdAt' | 'user' | 'userId' | 'publicAdId'> = {
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
        active: ad?.active ?? true, // Preserve active status on edit, default to true on create
    };
    
    try {
        if (ad) { // Editing existing ad
            await updateAd(firestore, ad.id, adData);
            toast({ title: "Ad Updated", description: "Your ad has been successfully updated." });
            router.push(isAdmin ? '/adminnarayan/ads' : '/my-ads');
        } else { // Creating new ad
            await createP2PAd(firestore, adData, {
                id: user.uid,
                userId: userData.userId,
                feedbackScore: userData.feedbackScore || 100,
                completedTrades: userData.completedTrades || 0,
                photoURL: userData.photoURL
            });
            toast({ title: "Ad Created", description: "Your ad has been successfully posted." });
            router.push(data.adType === 'sell' ? '/buy' : '/sell');
        }
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Operation Failed", description: "An error occurred." });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ad ? 'Edit P2P Advertisement' : 'Create a P2P Advertisement'}</CardTitle>
        <CardDescription>
          {ad ? `Editing ad ${ad.publicAdId}.` : 'Set up your ad to buy or sell coins. It will be visible to other users.'}
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
                    <FormLabel>Coin</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a coin" /></SelectTrigger>
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
                   <div className="space-y-4">
                       <Card>
                         <CardHeader className="p-4"><CardTitle className="text-base">Custom Method</CardTitle></CardHeader>
                         <CardContent className="p-4 pt-0">
                           <div className="flex items-center gap-2">
                             <Input
                                  placeholder="Type a custom method"
                                  value={customPaymentMethod}
                                  onChange={(e) => setCustomPaymentMethod(e.target.value)}
                              />
                             <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => {
                                      const newMethod = customPaymentMethod.trim();
                                      if (newMethod.split(/\s+/).length > 5) {
                                          toast({ variant: 'destructive', title: 'Error', description: 'Custom method cannot be more than 5 words.' });
                                          return;
                                      }
                                      addPaymentMethod(newMethod);
                                      setCustomPaymentMethod('');
                                  }}
                              >
                                  Add
                              </Button>
                           </div>
                         </CardContent>
                       </Card>

                       <Card>
                         <CardHeader className="p-4"><CardTitle className="text-base">Bank/Wallet Transfer</CardTitle></CardHeader>
                         <CardContent className="p-4 pt-0">
                            <Combobox 
                              options={paymentMethodOptions}
                              value="" 
                              onChange={addPaymentMethod}
                              placeholder="Add from predefined list..."
                              searchPlaceholder="Search payment methods..."
                              emptyText="No standard methods found."
                              shouldCloseOnSelect={true}
                            />
                         </CardContent>
                       </Card>

                        <Card>
                         <CardHeader className="p-4"><CardTitle className="text-base">Gift Cards</CardTitle></CardHeader>
                         <CardContent className="p-4 pt-0">
                            <Combobox 
                              options={giftCardOptions}
                              value="" 
                              onChange={addPaymentMethod}
                              placeholder="Add a gift card..."
                              searchPlaceholder="Search gift cards..."
                              emptyText="No gift cards found."
                              shouldCloseOnSelect={true}
                            />
                         </CardContent>
                       </Card>
                   </div>
                  <FormDescription>You can add up to 5 payment methods in total.</FormDescription>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {field.value?.map((pm, index) => (
                      <Badge key={index} variant="secondary">
                        {pm}
                        <button type="button" onClick={() => {
                            const updatedPms = field.value?.filter((_, i) => i !== index) || [];
                            field.onChange(updatedPms);
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
                      value={field.value}
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

            {watchedRateType === "market" ? (
              <FormField
                control={form.control}
                name="ratePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Rate Adjustment</FormLabel>
                    <div className="relative">
                      <Input type="number" step="0.01" placeholder="e.g. 5" {...field} value={field.value ?? ''} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                     <FormDescription>
                        Your price will float with the market. {arePricesLoading ? 'Loading market price...' : `Current price is approx. ${currentMarketPrice.toLocaleString(undefined, { style: 'currency', currency: form.getValues('fiatCurrency'), minimumFractionDigits: 2 })}.`} <br/>
                        Set your adjustment percentage (from -50% to 50%). E.g., '1.5' for 1.5% above market.
                    </FormDescription>
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
                    <FormLabel>Fixed Price per Coin</FormLabel>
                    <Input 
                      type="number" 
                      step="any" 
                      placeholder={arePricesLoading ? "Loading..." : `${currentMarketPrice.toLocaleString()}`} 
                      {...field}
                      value={field.value ?? ''}
                    />
                    <FormDescription>The fixed price in {form.getValues('fiatCurrency')}. Current market price is approx. {currentMarketPrice.toLocaleString(undefined, { style: 'currency', currency: form.getValues('fiatCurrency'), minimumFractionDigits: 2 })}.</FormDescription>
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
            
            {balanceError && !isAdmin && (
              <Alert variant="destructive">
                <Wallet className="h-4 w-4" />
                <AlertTitle>Insufficient Balance</AlertTitle>
                <AlertDescription>
                  {balanceError}
                  <Button asChild variant="link" className="p-0 h-auto ml-1" onClick={() => router.push('/wallets')}>
                    <Link href="/wallets">Fund your wallet</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" className="w-full md:w-auto" disabled={(!!balanceError && !isAdmin) || form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ad ? 'Save Changes' : 'Create Ad'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
