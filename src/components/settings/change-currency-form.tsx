
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirebase } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { currencies } from "@/lib/currencies";
import { countries } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Edit, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FlagIcon } from "../ui/flag-icon";

const regionalSchema = z.object({
  currency: z.string().min(1, "Please select a currency."),
  country: z.string().min(1, "Please select a country."),
});

export function ChangeCurrencyForm({ user: userData }: { user: User }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [currencySearchTerm, setCurrencySearchTerm] = useState("");
  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const form = useForm<z.infer<typeof regionalSchema>>({
    resolver: zodResolver(regionalSchema),
    defaultValues: {
      currency: userData?.preferredCurrency || "USD",
      country: userData?.country || "",
    }
  });

  useEffect(() => {
    if (userData) {
      form.setValue("currency", userData.preferredCurrency || "USD");
      form.setValue("country", userData.country || "");
    }
  }, [userData, form]);

  const { isSubmitting, watch } = form;
  const watchedCurrency = watch("currency");
  const watchedCountry = watch("country");


  const handleSettingsChange = async (values: z.infer<typeof regionalSchema>) => {
    if (!firestore || !user) return;
    
    const userRef = doc(firestore, "users", user.uid);

    try {
      await updateDoc(userRef, {
        preferredCurrency: values.currency,
        country: values.country,
      });
      toast({
        title: "Settings Updated",
        description: `Your regional settings have been saved.`,
      });
      setIsSheetOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update your settings.",
      });
    }
  };
  
  const filteredCurrencies = currencies.filter(c => 
    c.name.toLowerCase().includes(currencySearchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(currencySearchTerm.toLowerCase())
  );

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );
  
  const currentCurrency = currencies.find(c => c.code === watchedCurrency);
  const currentCountry = countries.find(c => c.code === watchedCountry);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regional Settings</CardTitle>
        <CardDescription>Manage your preferred currency and country of residence.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/50">
            <div>
                <p className="text-sm text-muted-foreground">Preferred Currency</p>
                <p className="font-semibold">{currentCurrency?.name || 'United States Dollar'}</p>
            </div>
            <p className="font-semibold">{currentCurrency?.code || 'USD'}</p>
          </div>
           <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/50">
            <div>
                <p className="text-sm text-muted-foreground">Country</p>
                <p className="font-semibold">{currentCountry?.name || 'Not set'}</p>
            </div>
            {currentCountry && <FlagIcon countryCode={currentCountry.code} />}
          </div>
      </CardContent>
      <CardFooter>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" /> Change Regional Settings
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
                <SheetHeader>
                    <SheetTitle>Change Regional Settings</SheetTitle>
                    <SheetDescription>
                        Your selections will be saved when you click the save button.
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSettingsChange)} className="flex flex-col flex-grow space-y-6">
                        <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Country</FormLabel>
                                 <Input 
                                    placeholder="Search country..."
                                    value={countrySearchTerm}
                                    onChange={(e) => setCountrySearchTerm(e.target.value)}
                                    />
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-1">
                                    <ScrollArea className="h-48 w-full rounded-md border">
                                    <div className="p-4">
                                        {filteredCountries.map((country) => (
                                        <FormItem key={country.code} className="flex items-center space-x-3 space-y-0 p-2">
                                            <FormControl><RadioGroupItem value={country.code} id={`country-${country.code}`} /></FormControl>
                                            <FormLabel htmlFor={`country-${country.code}`} className="font-normal w-full cursor-pointer flex items-center gap-2">
                                                <FlagIcon countryCode={country.code}/> {country.name}
                                            </FormLabel>
                                        </FormItem>
                                        ))}
                                    </div>
                                    </ScrollArea>
                                </RadioGroup>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Preferred Currency</FormLabel>
                                <Input 
                                    placeholder="Search currency..."
                                    value={currencySearchTerm}
                                    onChange={(e) => setCurrencySearchTerm(e.target.value)}
                                />
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-1">
                                    <ScrollArea className="h-48 w-full rounded-md border">
                                    <div className="p-4">
                                        {filteredCurrencies.map((currency) => (
                                        <FormItem key={currency.code} className="flex items-center space-x-3 space-y-0 p-2">
                                            <FormControl><RadioGroupItem value={currency.code} id={currency.code} /></FormControl>
                                            <FormLabel htmlFor={currency.code} className="font-normal w-full cursor-pointer">
                                            {currency.name} ({currency.code})
                                            </FormLabel>
                                        </FormItem>
                                        ))}
                                    </div>
                                    </ScrollArea>
                                </RadioGroup>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <SheetFooter className="mt-auto">
                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Settings
                            </Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
      </CardFooter>
    </Card>
  );
}
