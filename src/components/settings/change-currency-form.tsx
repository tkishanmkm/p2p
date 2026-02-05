"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { currencies } from "@/lib/currencies";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Loader2, Edit } from "lucide-react";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "../ui/skeleton";

const currencySchema = z.object({
  currency: z.string().min(1, "Please select a currency."),
});

export function ChangeCurrencyForm() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const userRef = useMemoFirebase(() => (user ? doc(firestore, "users", user.uid) : null), [user, firestore]);
  const { data: userData, isLoading: isUserLoading } = useDoc<User>(userRef);

  const form = useForm<z.infer<typeof currencySchema>>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      currency: userData?.preferredCurrency || "USD",
    }
  });

  useEffect(() => {
    if (userData) {
      form.setValue("currency", userData.preferredCurrency || "USD");
    }
  }, [userData, form]);

  const { isSubmitting } = form.formState;

  const handleCurrencyChange = async (values: z.infer<typeof currencySchema>) => {
    if (!firestore || !userRef) return;

    try {
      await updateDoc(userRef, {
        preferredCurrency: values.currency,
      });
      toast({
        title: "Currency Updated",
        description: `Your preferred currency is now ${values.currency}.`,
      });
      setIsSheetOpen(false); // Close sheet on successful save
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update your preferred currency.",
      });
    }
  };
  
  const filteredCurrencies = currencies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const currentCurrencyCode = userData?.preferredCurrency || 'USD';
  const currentCurrency = currencies.find(c => c.code === currentCurrencyCode);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferred Currency</CardTitle>
        <CardDescription>Select the fiat currency you prefer for display purposes across the app.</CardDescription>
      </CardHeader>
      <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/50">
                {isUserLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                ) : (
                    <div>
                        <p className="font-semibold text-lg">{currentCurrency?.name || 'United States Dollar'}</p>
                        <p className="text-muted-foreground">{currentCurrency?.code || 'USD'}</p>
                    </div>
                )}
                <div>
                     <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline">
                                <Edit className="mr-2 h-4 w-4" /> Change
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="flex flex-col">
                            <SheetHeader>
                                <SheetTitle>Change Preferred Currency</SheetTitle>
                                <SheetDescription>
                                    Your selection will be saved automatically.
                                </SheetDescription>
                            </SheetHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleCurrencyChange)} className="flex flex-col flex-grow">
                                    <div className="space-y-4 flex-grow">
                                        <Input 
                                        placeholder="Search currency..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="currency"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3 h-full">
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        className="space-y-1"
                                                    >
                                                    <ScrollArea className="h-[calc(100vh-18rem)] w-full rounded-md border">
                                                        <div className="p-4">
                                                        {filteredCurrencies.map((currency) => (
                                                            <FormItem key={currency.code} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50">
                                                            <FormControl>
                                                                <RadioGroupItem value={currency.code} id={currency.code} />
                                                            </FormControl>
                                                            <FormLabel htmlFor={currency.code} className="font-normal w-full cursor-pointer">
                                                                {currency.name} ({currency.code})
                                                            </FormLabel>
                                                            </FormItem>
                                                        ))}
                                                        </div>
                                                    </ScrollArea>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                            />
                                    </div>
                                    <SheetFooter className="mt-4">
                                        <Button type="submit" disabled={isSubmitting || isUserLoading} className="w-full">
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Currency
                                        </Button>
                                    </SheetFooter>
                                </form>
                            </Form>
                        </SheetContent>
                    </Sheet>
                </div>
          </div>
      </CardContent>
    </Card>
  );
}