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
import { Combobox } from "@/components/ui/combobox";
import { useEffect } from "react";

const currencySchema = z.object({
  currency: z.string().min(1, "Please select a currency."),
});

export function ChangeCurrencyForm() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const userRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid) : null, [user, firestore]);
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
  
  const currencyOptions = currencies.map((c) => ({ value: c, label: c }));

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleCurrencyChange)}>
          <CardHeader>
            <CardTitle>Preferred Currency</CardTitle>
            <CardDescription>Select the fiat currency you prefer for display purposes across the app.</CardDescription>
          </CardHeader>
          <CardContent>
            {isUserLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Combobox
                        options={currencyOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select a currency..."
                    />
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
