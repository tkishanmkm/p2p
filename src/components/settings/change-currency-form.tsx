// This is a new file
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
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

const currencySchema = z.object({
  currency: z.string().min(1, "Please select a currency."),
});

export function ChangeCurrencyForm() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const userRef = useMemoFirebase(() => (user ? doc(firestore, "users", user.uid) : null), [user, firestore]);
  const { data: userData, isLoading: isUserLoading } = useDoc<User>(userRef);

  const form = useForm<z.infer<typeof currencySchema>>({
    resolver: zodResolver(currencySchema),
  });

  useEffect(() => {
    if (userData?.preferredCurrency) {
      form.setValue("currency", userData.preferredCurrency);
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

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleCurrencyChange)}>
          <CardHeader>
            <CardTitle>Preferred Currency</CardTitle>
            <CardDescription>Select the fiat currency you prefer for display purposes across the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              placeholder="Search currency by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isUserLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-1"
                        >
                          <ScrollArea className="h-72 w-full rounded-md border">
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
            )}
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting || isUserLoading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Currency
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
