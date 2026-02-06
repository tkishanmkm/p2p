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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { currencies } from "@/lib/currencies";
import { countries } from "@/lib/countries";
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
import { Loader2, Wallet, Edit, Search } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FlagIcon } from "../ui/flag-icon";

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
  
  targetedCountries: z.array(z.string()).optional(),
  blockedCountries: z.array(z.string()).optional(),

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
  paymentTimeLimit: z.coerce.number().min(30).default(30),
  minCompletedTrades: z.coerce.number().min(0).max(5).default(0),
  terms: z.string().min(10, "Terms must be at least 10 characters.").max(500, "Terms cannot exceed 500 characters."),
  tags: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
    if (data.rateType === 'market') {
        if (data.ratePercent === undefined || data.ratePercent === null || isNaN(data.ratePercent)) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Market rate adjustment is required.",
                path: ["ratePercent"],
            });
        }
    }
    if (data.rateType === 'fixed') {
        if (data.fixedRate === undefined || data.fixedRate === null || isNaN(data.fixedRate) || data.fixedRate <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A positive fixed rate is required.",
                path: ["fixedRate"],
            });
        }
    }
    if (data.maxAmount < data.minAmount) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Max amount must be greater than or equal to min amount.",
            path: ["maxAmount"],
        });
    }
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
  const [currencySearchTerm, setCurrencySearchTerm] = useState("");
  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const [isCurrencySheetOpen, setIsCurrencySheetOpen] = useState(false);
  const [isTargetCountrySheetOpen, setIsTargetCountrySheetOpen] = useState(false);
  const [isBlockedCountrySheetOpen, setIsBlockedCountrySheetOpen] = useState(false);
  const [isBankMethodSheetOpen, setIsBankMethodSheetOpen] = useState(false);
  const [isGiftCardSheetOpen, setIsGiftCardSheetOpen] = useState(false);
  const [paymentMethodSearchTerm, setPaymentMethodSearchTerm] = useState("");

  const adCreatorId = ad?.userId || user?.uid;

  const userRef = adCreatorId ? doc(firestore, "users", adCreatorId) : null;
  const { data: userData } = useDoc<User>(userRef);

  const walletsRef = useMemoFirebase(() => adCreatorId ? collection(firestore, 'users', adCreatorId, 'wallets') : null, [adCreatorId, firestore]);
  const { data: wallets } = useCollection<UserWallet>(walletsRef);

  const form = useForm<AdFormValues>({
    resolver: zodResolver(adFormSchema),
    shouldUnregister: false,
    defaultValues: ad 
      ? { ...ad, ratePercent: ad.ratePercent ?? 5, paymentTimeLimit: ad.paymentTimeLimit || 30, minCompletedTrades: ad.minCompletedTrades || 0 } 
      : {
          adType: "sell",
          crypto: "BTC",
          fiatCurrency: "USD",
          paymentMethods: [],
          rateType: "market",
          ratePercent: 5,
          paymentTimeLimit: 30,
          minCompletedTrades: 0,
          tags: [],
        },
  });
  
  const watchedFields = form.watch();
  const currentMarketPrice = prices[watchedFields.crypto as CryptoCurrency] || 0;
  
    useEffect(() => {
        if (!currentMarketPrice) return

        if (watchedFields.rateType === "market") {
            // default market = 5%
            if (watchedFields.ratePercent == null) {
                form.setValue("ratePercent", 5, { shouldValidate: true })
            }
            // clear fixed price
            form.setValue("fixedRate", undefined)
        }

        if (watchedFields.rateType === "fixed") {
            // default fixed = current market price
            if (watchedFields.fixedRate == null) {
                form.setValue(
                    "fixedRate",
                    Number(currentMarketPrice.toFixed(2)),
                    { shouldValidate: true }
                )
            }
            // clear market percent
            form.setValue("ratePercent", undefined)
        }
    }, [
        watchedFields.rateType,
        watchedFields.crypto,
        currentMarketPrice,
        form
    ]);


  useEffect(() => {
    setBalanceError(null);
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

  }, [watchedFields, wallets, currentMarketPrice]);


  const cryptoOptions = SUPPORTED_CRYPTOS.map((c) => ({ value: c.name, label: c.name }));
  
  const filteredCurrencies = currencies.filter(c => 
    c.name.toLowerCase().includes(currencySearchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(currencySearchTerm.toLowerCase())
  );
  
  const filteredCountries = [{name: 'All Countries', code: 'all'}, ...countries].filter(c =>
    c.name.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );

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
    form.setValue('paymentMethods', [...currentMethods, method], { shouldValidate: true });
  };

  const filteredPaymentMethods = paymentMethods.filter(pm => pm.toLowerCase().includes(paymentMethodSearchTerm.toLowerCase()));
  const filteredGiftCardMethods = giftCardPaymentMethods.filter(pm => pm.toLowerCase().includes(paymentMethodSearchTerm.toLowerCase()));


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
        paymentTimeLimit: data.paymentTimeLimit,
        terms: data.terms,
        tags: data.tags,
        active: ad?.active ?? true, // Preserve active status on edit, default to true on create
        targetedCountries: data.targetedCountries,
        blockedCountries: data.blockedCountries,
        minCompletedTrades: data.minCompletedTrades,
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
                country: userData.country,
                feedbackScore: userData.feedbackScore ?? 100,
                completedTrades: userData.completedTrades ?? 0,
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

            <div className="space-y-8">
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
                render={({ field }) => {
                    const selectedCurrency = currencies.find(c => c.code === field.value);
                    return (
                    <FormItem>
                        <FormLabel>With Fiat</FormLabel>
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/50">
                            <div>
                                <p className="font-semibold text-lg">{selectedCurrency?.name || 'Select a currency'}</p>
                                <p className="text-muted-foreground">{selectedCurrency?.code || ''}</p>
                            </div>
                            <div>
                                <Sheet open={isCurrencySheetOpen} onOpenChange={setIsCurrencySheetOpen}>
                                    <SheetTrigger asChild>
                                        <Button type="button" variant="outline">
                                            <Edit className="mr-2 h-4 w-4" /> Change
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent className="flex flex-col">
                                        <SheetHeader>
                                            <SheetTitle>Change Fiat Currency</SheetTitle>
                                            <SheetDescription>
                                                Select the currency for your ad.
                                            </SheetDescription>
                                        </SheetHeader>
                                        <div className="space-y-4 flex-grow">
                                            <Input 
                                            placeholder="Search currency..."
                                            value={currencySearchTerm}
                                            onChange={(e) => setCurrencySearchTerm(e.target.value)}
                                            />
                                            <RadioGroup
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    setIsCurrencySheetOpen(false); // Close sheet on selection
                                                }}
                                                value={field.value}
                                                className="space-y-1"
                                            >
                                                <ScrollArea className="h-[calc(100vh-12rem)] w-full rounded-md border">
                                                    <div className="p-4">
                                                        {filteredCurrencies.map((currency) => (
                                                        <FormItem key={currency.code} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50">
                                                            <FormControl>
                                                            <RadioGroupItem value={currency.code} id={`sheet-fiat-${currency.code}`} />
                                                            </FormControl>
                                                            <FormLabel htmlFor={`sheet-fiat-${currency.code}`} className="font-normal w-full cursor-pointer">
                                                            {currency.name} ({currency.code})
                                                            </FormLabel>
                                                        </FormItem>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </RadioGroup>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}}
              />
            </div>
            
            <FormField
              control={form.control}
              name="paymentMethods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Methods</FormLabel>
                  <FormDescription>Select up to 5 methods in total from bank transfers or gift cards.</FormDescription>
                  <div className="flex flex-wrap gap-2 pt-2 min-h-[2.5rem]">
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

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    {/* Sheet 1: Bank/Wallet Methods */}
                    <Sheet open={isBankMethodSheetOpen} onOpenChange={setIsBankMethodSheetOpen}>
                      <SheetTrigger asChild>
                          <Button type="button" variant="outline" className="flex-1">
                              <Edit className="mr-2 h-4 w-4" /> Add Bank/Wallet Method
                          </Button>
                      </SheetTrigger>
                      <SheetContent className="flex flex-col">
                          <SheetHeader>
                              <SheetTitle>Select Bank/Wallet Methods</SheetTitle>
                              <SheetDescription>You can select up to 5 methods in total.</SheetDescription>
                          </SheetHeader>
                          <div className="py-2 space-y-2">
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
                                          addPaymentMethod(customPaymentMethod.trim());
                                          setCustomPaymentMethod('');
                                      }}
                                  >
                                      Add
                                  </Button>
                              </div>
                               <Input 
                                  placeholder="Search methods..."
                                  value={paymentMethodSearchTerm}
                                  onChange={(e) => setPaymentMethodSearchTerm(e.target.value)}
                              />
                          </div>
                          <ScrollArea className="flex-grow rounded-md border">
                              <div className="p-4 space-y-4">
                                  <div>
                                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Bank & Wallet Transfers</h4>
                                      {filteredPaymentMethods.map((pm) => (
                                          <FormItem key={pm} className="flex flex-row items-start space-x-3 space-y-0 py-2">
                                              <FormControl>
                                                  <Checkbox
                                                      checked={field.value?.includes(pm)}
                                                      onCheckedChange={(checked) => {
                                                          if (field.value?.length >= 5 && checked) {
                                                              toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can only add up to 5 payment methods.' });
                                                              return;
                                                          }
                                                          return checked
                                                              ? field.onChange([...(field.value || []), pm])
                                                              : field.onChange(field.value?.filter(v => v !== pm));
                                                      }}
                                                  />
                                              </FormControl>
                                              <FormLabel className="font-normal w-full cursor-pointer">{pm}</FormLabel>
                                          </FormItem>
                                      ))}
                                  </div>
                              </div>
                          </ScrollArea>
                      </SheetContent>
                    </Sheet>

                    {/* Sheet 2: Gift Card Methods */}
                    <Sheet open={isGiftCardSheetOpen} onOpenChange={setIsGiftCardSheetOpen}>
                      <SheetTrigger asChild>
                          <Button type="button" variant="outline" className="flex-1">
                              <Edit className="mr-2 h-4 w-4" /> Add Gift Card Method
                          </Button>
                      </SheetTrigger>
                      <SheetContent className="flex flex-col">
                          <SheetHeader>
                              <SheetTitle>Select Gift Card Methods</SheetTitle>
                              <SheetDescription>You can select up to 5 methods in total.</SheetDescription>
                          </SheetHeader>
                          <div className="py-2 space-y-2">
                               <Input 
                                  placeholder="Search gift cards..."
                                  value={paymentMethodSearchTerm}
                                  onChange={(e) => setPaymentMethodSearchTerm(e.target.value)}
                              />
                          </div>
                          <ScrollArea className="flex-grow rounded-md border">
                              <div className="p-4 space-y-4">
                                   <div>
                                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Gift Cards</h4>
                                      {filteredGiftCardMethods.map((pm) => (
                                          <FormItem key={pm} className="flex flex-row items-start space-x-3 space-y-0 py-2">
                                              <FormControl>
                                                  <Checkbox
                                                      checked={field.value?.includes(pm)}
                                                      onCheckedChange={(checked) => {
                                                          if (field.value?.length >= 5 && checked) {
                                                              toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can only add up to 5 payment methods.' });
                                                              return;
                                                          }
                                                          return checked
                                                              ? field.onChange([...(field.value || []), pm])
                                                              : field.onChange(field.value?.filter(v => v !== pm));
                                                      }}
                                                  />
                                              </FormControl>
                                              <FormLabel className="font-normal w-full cursor-pointer">{pm}</FormLabel>
                                          </FormItem>
                                      ))}
                                  </div>
                              </div>
                          </ScrollArea>
                      </SheetContent>
                    </Sheet>
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

            {watchedFields.rateType === "market" ? (
              <FormField
                control={form.control}
                name="ratePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Rate Adjustment</FormLabel>
                    <div className="relative">
                      <Input type="number" step="0.01" placeholder="e.g. 5" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} value={field.value ?? ''} />
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
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      value={field.value ?? ''}
                    />
                    <FormDescription>The fixed price in {form.getValues('fiatCurrency')}. Current market price is approx. {currentMarketPrice.toLocaleString(undefined, { style: 'currency', currency: form.getValues('fiatCurrency'), minimumFractionDigits: 2 })}.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
               <FormField
                control={form.control}
                name="paymentTimeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Window</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time limit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[30, 60, 90, 120].map(time => (
                          <SelectItem key={time} value={String(time)}>
                            {time} minutes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Time buyer has to pay.</FormDescription>
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
            
            <div className="space-y-6">
                <h3 className="font-medium text-lg">Trader Requirements</h3>
                <FormField
                    control={form.control}
                    name="minCompletedTrades"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Minimum Completed Trades</FormLabel>
                            <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={String(field.value)}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="No requirement" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {[0, 1, 2, 3, 4, 5].map(num => (
                                    <SelectItem key={num} value={String(num)}>
                                    {num === 0 ? "No requirement" : `${num} completed trade${num > 1 ? 's' : ''}`}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>Set a minimum number of trades a user must have completed to start a trade with you.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
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
