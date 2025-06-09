"use client";

import React from "react"; // Add React import
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Percent, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import ProtectedRoute from "@/components/ProtectedRoute";

const surchargeSchema = z.object({
  income: z.coerce
    .number({ invalid_type_error: "Income must be a number" })
    .positive({ message: "Income must be a positive number" }),
});

type SurchargeFormData = z.infer<typeof surchargeSchema>;

// Surcharge rates for FY 2024-25 (AY 2025-26)
const surchargeRates = [
  { limit: 5000000, rate: 0 }, // Up to 50 Lakh
  { limit: 10000000, rate: 0.1 }, // 50 Lakh to 1 Crore
  { limit: 20000000, rate: 0.15 }, // 1 Crore to 2 Crore
  { limit: 50000000, rate: 0.25 }, // 2 Crore to 5 Crore
  { limit: Infinity, rate: 0.37 }, // Above 5 Crore
];

// Special surcharge rates for certain incomes (e.g., dividends, capital gains u/s 111A, 112, 112A)
// For simplicity, we'll use the general rates but mention the cap.
const MAX_SURCHARGE_CAP_DIVIDEND_CAPITAL_GAINS = 0.15;
const MAX_SURCHARGE_CAP_NEW_REGIME = 0.25; // Max surcharge under new regime is capped at 25%

function SurchargeContent() {
  const [surchargeResult, setSurchargeResult] = useState<{
    rate: number;
    amount: number; // Note: This is illustrative amount (Rate * Income)
    note?: string;
  } | null>(null);

  const form = useForm<SurchargeFormData>({
    resolver: zodResolver(surchargeSchema),
    defaultValues: {
      income: undefined, // Initialize number as undefined
    },
  });

  function calculateSurcharge(income: number): {
    rate: number;
    amount: number;
    note?: string;
  } {
    let rate = 0;
    if (income > 50000000) rate = 0.37;
    else if (income > 20000000) rate = 0.25;
    else if (income > 10000000) rate = 0.15;
    else if (income > 5000000) rate = 0.1;
    else rate = 0;

    // Note: Actual surcharge calculation depends on the *tax payable* on that income, not the income itself.
    // This calculator provides the *rate* applicable based on total income.
    // The amount shown is illustrative (Rate * Income), NOT the actual surcharge payable.
    const illustrativeAmount = income * rate;

    let note = `Based on a total income of ₹${income.toLocaleString(
      "en-IN"
    )}, the applicable surcharge rate is ${(rate * 100).toFixed(0)}%.`;
    note += `\n\nImportant: The actual surcharge amount is calculated on the *income tax payable*, not the total income. Marginal relief may apply near threshold limits.`;
    note += `\nUnder the New Tax Regime, the maximum surcharge rate is capped at 25%. Surcharge on certain incomes like dividends and specified capital gains (e.g., Sec 111A, 112A) is capped at 15%.`;

    return {
      rate: rate,
      amount: illustrativeAmount, // Illustrative only
      note: note,
    };
  }

  // Helper for number input fields
  const handleNumberChange = (
    field: any,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    field.onChange(value === "" ? undefined : Number(value));
  };

  function onSubmit(values: SurchargeFormData) {
    const result = calculateSurcharge(values.income);
    setSurchargeResult(result);
  }

  return (
    // Add container class for padding and max-width
    <div className="container mx-auto space-y-8 p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-3">
        <DollarSign className="size-8" />
        STC & Surcharge
      </h1>
      <p className="text-muted-foreground text-lg">
        Understand Short Term Capital Gains (STC) tax and calculate the
        applicable income tax surcharge rate based on your total income for FY
        2024-25.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Surcharge Calculator */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle
              id="surcharge-calculator-title"
              className="flex items-center gap-2"
            >
              <Percent className="text-accent" />
              Surcharge Calculator (FY 2024-25)
            </CardTitle>
            <CardDescription>
              Estimate the surcharge rate applicable to your income level.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                aria-labelledby="surcharge-calculator-title"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="income"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="surcharge-income">
                        Total Annual Income (INR)
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="surcharge-income"
                          type="number"
                          placeholder="e.g., 12000000"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => handleNumberChange(field, e)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full sm:w-auto">
                  Calculate Surcharge Rate
                </Button>
              </form>
            </Form>
            {surchargeResult !== null && (
              <Alert role="status" className="mt-6 bg-secondary">
                <Percent className="h-4 w-4" />
                <AlertTitle>Applicable Surcharge Rate</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap text-sm md:text-base">
                  <span className="font-bold text-lg text-primary">
                    {(surchargeResult.rate * 100).toFixed(0)}%
                  </span>
                  <br />
                  {surchargeResult.note}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Surcharge & STC Information */}
        <div className="space-y-6 md:space-y-8">
          <Card
            className="shadow-md"
            role="complementary"
            aria-labelledby="surcharge-info-title"
          >
            <CardHeader>
              <CardTitle
                id="surcharge-info-title"
                className="flex items-center gap-2"
              >
                <Info className="text-accent" />
                Understanding Surcharge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm md:text-base">
                Surcharge is an additional tax levied on individuals earning
                high incomes. It's calculated as a percentage of the income tax
                payable, not the total income.
              </p>
              <Table aria-label="Surcharge Rates FY 2024-25">
                <TableHeader>
                  <TableRow>
                    <TableHead>Total Income</TableHead>
                    <TableHead className="text-right">
                      Surcharge Rate*
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Up to ₹50 Lakh</TableCell>
                    <TableCell className="text-right">Nil</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Above ₹50 Lakh up to ₹1 Crore</TableCell>
                    <TableCell className="text-right">10%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Above ₹1 Crore up to ₹2 Crore</TableCell>
                    <TableCell className="text-right">15%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Above ₹2 Crore up to ₹5 Crore</TableCell>
                    <TableCell className="text-right">25%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Above ₹5 Crore</TableCell>
                    <TableCell className="text-right">37%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-2">
                * Max surcharge is capped at 25% under the New Regime (Sec
                115BAC). Max surcharge on dividends and capital gains (Sec 111A,
                112, 112A) is 15%. Marginal Relief might be applicable.
              </p>
            </CardContent>
          </Card>

          <Card
            className="shadow-md"
            role="complementary"
            aria-labelledby="stc-info-title"
          >
            <CardHeader>
              <CardTitle
                id="stc-info-title"
                className="flex items-center gap-2"
              >
                <Info className="text-accent" />
                Short Term Capital Gains (STCG)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground space-y-2 text-sm md:text-base">
                <p>
                  Short-Term Capital Gains (STCG) arise from the sale of capital
                  assets held for a short period. The holding period varies by
                  asset type:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>
                    <strong>Listed Equity Shares/Equity Mutual Funds:</strong>{" "}
                    Held for 12 months or less.
                  </li>
                  <li>
                    <strong>
                      Other Assets (e.g., Debt Funds, Property, Gold):
                    </strong>{" "}
                    Held for 36 months or less (24 months for immovable property
                    from FY 2017-18).
                  </li>
                </ul>
              </div>
              <Separator className="my-4" />
              <p className="text-muted-foreground font-semibold text-sm md:text-base">
                Taxation:
              </p>
              <ul className="list-disc pl-5 mt-2 text-muted-foreground space-y-1 text-sm md:text-base">
                <li>
                  <strong>STCG under Section 111A:</strong> Taxed at a flat rate
                  of 15% (plus cess and surcharge, if applicable). This applies
                  to STCG from the sale of equity shares listed on a recognized
                  stock exchange or units of equity-oriented mutual funds, where
                  Securities Transaction Tax (STT) is paid.
                </li>
                <li>
                  <strong>Other STCG:</strong> Added to your total income and
                  taxed according to your applicable income tax slab rate.
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Consult a tax professional for specific scenarios involving
                capital gains.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Define props for the page component
interface SurchargePageProps {
  params: Record<string, string | string[] | undefined>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function SurchargePage({
  params,
  searchParams,
}: SurchargePageProps) {
  // Explicitly use React.use if needed for params/searchParams
  // const resolvedParams = React.use(params);
  // const resolvedSearchParams = React.use(searchParams);

  return (
    <ProtectedRoute>
      <SurchargeContent />
    </ProtectedRoute>
  );
}
