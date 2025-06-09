// src/app/ai-suggestions/page.tsx
"use client";

import React from "react"; // Add React import
import * as z from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getTaxSavingSuggestions,
  type TaxSavingSuggestionsInput,
  type TaxSavingSuggestionsOutput,
} from "@/ai/flows/tax-saving-suggestions";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  Coins,
} from "lucide-react"; // Added Coins
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/ProtectedRoute";

// Form schema remains the same
const formSchema = z.object({
  income: z.coerce
    .number({ invalid_type_error: "Income must be a number" })
    .positive({ message: "Income must be a positive number" }),
  deductions: z
    .string()
    .min(1, { message: "Please list applicable deductions or N/A" }), // Allow N/A
  investments: z
    .string()
    .min(1, { message: "Please list your investments or N/A" }), // Allow N/A
});

type FormData = z.infer<typeof formSchema>;

function AiSuggestionsContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] =
    useState<TaxSavingSuggestionsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      income: undefined, // Use undefined for number fields initially
      deductions: "",
      investments: "",
    },
  });

  async function onSubmit(values: FormData) {
    setIsLoading(true);
    setSuggestions(null);
    setError(null);

    try {
      // Use the updated function
      const result = await getTaxSavingSuggestions(values);
      setSuggestions(result);
      toast({
        title: "Suggestions Generated",
        description: "AI has provided tax saving suggestions.",
      });
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to get suggestions: ${errorMessage}`);
      toast({
        title: "Error",
        description: `Failed to generate AI suggestions. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    // Add container class for padding and max-width
    <div className="container mx-auto space-y-8 p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-3">
        <Lightbulb className="size-8" />
        AI Tax Suggestions
      </h1>
      <p className="text-muted-foreground text-lg">
        Enter your financial details to receive personalized tax saving
        strategies, regime comparisons, and warnings from our AI (FY 2024-25).
      </p>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Your Financial Information</CardTitle>
          <CardDescription>
            Provide the details below for AI analysis. Data is processed
            securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="income"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="income">Annual Income (INR)</FormLabel>
                    <FormControl>
                      <Input
                        id="income"
                        type="number"
                        placeholder="e.g., 1500000"
                        // Use valueAsNumber for better handling, fallback to empty string for display
                        {...field}
                        value={field.value ?? ""} // Display empty string if undefined
                        onChange={(e) => {
                          const value = e.target.value;
                          // Convert to number or undefined if empty/invalid
                          field.onChange(
                            value === "" ? undefined : Number(value)
                          );
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Your total annual gross income.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deductions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="deductions">
                      Available Deductions
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="deductions"
                        placeholder="e.g., 80C: 150000, 80D: 25000, HRA, Std Ded, or N/A"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      List deductions (comma-separated). Use amounts like '80C:
                      1.5L' if known, or 'N/A'.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="investments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="investments">
                      Investments Made
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="investments"
                        placeholder="e.g., ELSS, PPF, NPS, Health Insurance, or N/A"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      List your tax-saving investments (comma-separated), or
                      'N/A'.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Get AI Suggestions"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {suggestions && (
        <Card
          className="shadow-lg mt-8"
          role="region"
          aria-labelledby="ai-analysis-title"
        >
          <CardHeader>
            <CardTitle id="ai-analysis-title" className="text-2xl text-primary">
              AI Generated Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Estimated Tax Section */}
            {(suggestions.estimatedTaxOldRegime !== undefined ||
              suggestions.estimatedTaxNewRegime !== undefined) && (
              <>
                <section
                  aria-labelledby="estimated-tax-heading"
                  className="space-y-4"
                >
                  <h3
                    id="estimated-tax-heading"
                    className="text-xl font-semibold flex items-center gap-2"
                  >
                    <Coins className="text-accent" /> Estimated Tax (FY 2024-25)
                  </h3>
                  <div className="text-muted-foreground space-y-1">
                    <p>
                      <strong>Old Regime:</strong> ₹{" "}
                      {suggestions.estimatedTaxOldRegime?.toLocaleString(
                        "en-IN"
                      ) ?? "N/A"}
                    </p>
                    <p>
                      <strong>New Regime (Default):</strong> ₹{" "}
                      {suggestions.estimatedTaxNewRegime?.toLocaleString(
                        "en-IN"
                      ) ?? "N/A"}
                    </p>
                  </div>
                </section>
                <Separator />
              </>
            )}

            <section
              aria-labelledby="suggestions-heading"
              className="space-y-4"
            >
              <h3
                id="suggestions-heading"
                className="text-xl font-semibold flex items-center gap-2"
              >
                <Lightbulb className="text-accent" /> Personalized Suggestions
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {suggestions.suggestions}
              </p>
            </section>
            <Separator />
            <section aria-labelledby="comparison-heading" className="space-y-4">
              <h3
                id="comparison-heading"
                className="text-xl font-semibold flex items-center gap-2"
              >
                <BookOpen className="text-accent" /> Tax Regime Comparison
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {suggestions.taxRegimeComparison}
              </p>
            </section>
            <Separator />
            <section aria-labelledby="mistakes-heading" className="space-y-4">
              <h3
                id="mistakes-heading"
                className="text-xl font-semibold flex items-center gap-2"
              >
                <AlertTriangle className="text-destructive" /> Common Mistakes &
                Warnings
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {suggestions.commonMistakes}
              </p>
            </section>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Define props for the page component
interface AiSuggestionsPageProps {
  params: Record<string, string | string[] | undefined>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function AiSuggestionsPage({
  params,
  searchParams,
}: AiSuggestionsPageProps) {
  // Explicitly use React.use if needed for params/searchParams
  // const resolvedParams = React.use(params);
  // const resolvedSearchParams = React.use(searchParams);

  return (
    <ProtectedRoute>
      <AiSuggestionsContent />
    </ProtectedRoute>
  );
}
