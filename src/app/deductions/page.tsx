// src/app/deductions/page.tsx
"use client";

import React from "react"; // Add React import
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ReceiptText, ShieldCheck, Home, Calculator } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import ProtectedRoute from "@/components/ProtectedRoute"; // Import ProtectedRoute

// --- Schemas ---
const section80CSchema = z.object({
  investment80C: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .nonnegative({ message: "Amount cannot be negative" })
    .optional(), // Made optional
});

const section80DSchema = z.object({
  premiumSelf: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .nonnegative({ message: "Amount cannot be negative" })
    .optional(), // Made optional
  isSelfSenior: z.boolean().default(false).optional(),
  premiumParents: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .nonnegative({ message: "Amount cannot be negative" })
    .optional(), // Made optional
  areParentsSenior: z.boolean().default(false).optional(),
});

const hraSchema = z.object({
  basicSalary: z.coerce.number().positive(),
  da: z.coerce.number().nonnegative().optional().default(0),
  hraReceived: z.coerce.number().positive(),
  rentPaid: z.coerce.number().positive(),
  metroCity: z.enum(["yes", "no"], {
    required_error: "Please select if you live in a metro city.",
  }), // Added required error
});

// --- Types ---
type Section80CFormData = z.infer<typeof section80CSchema>;
type Section80DFormData = z.infer<typeof section80DSchema>;
type HraFormData = z.infer<typeof hraSchema>;

// --- Constants ---
const MAX_80C_LIMIT = 150000;
const MAX_80D_SELF_NORMAL = 25000;
const MAX_80D_SELF_SENIOR = 50000;
const MAX_80D_PARENTS_NORMAL = 25000;
const MAX_80D_PARENTS_SENIOR = 50000;

// --- Helper Functions ---
function calculate80CDeduction(investment?: number): number {
  return Math.min(investment || 0, MAX_80C_LIMIT);
}

function calculate80DDeduction(data: Section80DFormData): number {
  const selfLimit = data.isSelfSenior
    ? MAX_80D_SELF_SENIOR
    : MAX_80D_SELF_NORMAL;
  const parentLimit = data.areParentsSenior
    ? MAX_80D_PARENTS_SENIOR
    : MAX_80D_PARENTS_NORMAL;

  const selfDeduction = Math.min(data.premiumSelf || 0, selfLimit);
  const parentDeduction = Math.min(data.premiumParents || 0, parentLimit);

  return selfDeduction + parentDeduction;
}

function calculateHraExemption(data: HraFormData): number {
  const salaryForHra = data.basicSalary + (data.da || 0); // Typically DA forming part of retirement benefits

  // 1. Actual HRA Received
  const actualHra = data.hraReceived;

  // 2. Rent Paid minus 10% of Salary
  const rentMinus10PercSalary = Math.max(0, data.rentPaid - 0.1 * salaryForHra);

  // 3. 50% of Salary (Metro) or 40% of Salary (Non-Metro)
  const percentageOfSalary =
    data.metroCity === "yes" ? 0.5 * salaryForHra : 0.4 * salaryForHra;

  // Exemption is the minimum of the three
  return Math.min(actualHra, rentMinus10PercSalary, percentageOfSalary);
}

// --- Component Content ---
function DeductionsContent() {
  const [deduction80C, setDeduction80C] = useState<number | null>(null);
  const [deduction80D, setDeduction80D] = useState<number | null>(null);
  const [hraExemption, setHraExemption] = useState<number | null>(null);

  const form80C = useForm<Section80CFormData>({
    resolver: zodResolver(section80CSchema),
    defaultValues: {
      investment80C: undefined, // Initialize optional number as undefined
    },
  });
  const form80D = useForm<Section80DFormData>({
    resolver: zodResolver(section80DSchema),
    defaultValues: {
      premiumSelf: undefined, // Initialize optional number as undefined
      isSelfSenior: false,
      premiumParents: undefined, // Initialize optional number as undefined
      areParentsSenior: false,
    },
  });
  const formHra = useForm<HraFormData>({
    resolver: zodResolver(hraSchema),
    defaultValues: {
      basicSalary: undefined, // Initialize number as undefined
      da: undefined, // Initialize optional number as undefined
      hraReceived: undefined, // Initialize number as undefined
      rentPaid: undefined, // Initialize number as undefined
      metroCity: undefined, // Keep as undefined for radio group
    },
  });

  function onSubmit80C(values: Section80CFormData) {
    setDeduction80C(calculate80CDeduction(values.investment80C));
  }

  function onSubmit80D(values: Section80DFormData) {
    setDeduction80D(calculate80DDeduction(values));
  }

  function onSubmitHra(values: HraFormData) {
    setHraExemption(calculateHraExemption(values));
  }

  // Helper for number input fields
  const handleNumberChange = (
    field: any,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    field.onChange(value === "" ? undefined : Number(value));
  };

  const renderCalculatorResult = (
    title: string,
    amount: number | null,
    unit: string = "Deduction"
  ) => {
    if (amount === null) return null;
    return (
      <Alert role="status" className="mt-6 bg-secondary">
        <Calculator className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          Eligible {unit}:{" "}
          <span className="font-bold text-lg text-primary">
            ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </span>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    // Add container class for padding and max-width
    <div className="container mx-auto space-y-8 p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-3">
        <ReceiptText className="size-8" />
        Deductions Guide & Calculators
      </h1>
      <p className="text-muted-foreground text-lg">
        Explore common tax deductions (FY 2024-25) available under the Old Tax
        Regime and calculate potential savings. Most deductions are not
        available under the New Tax Regime.
      </p>

      <Accordion
        type="single"
        collapsible
        className="w-full space-y-4"
        defaultValue="item-1"
      >
        {/* Section 80C */}
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline bg-secondary/50 px-4 rounded-t-md">
            <div className="flex items-center gap-2">
              <ReceiptText className="text-accent" /> Section 80C
            </div>
          </AccordionTrigger>
          <AccordionContent className="border border-t-0 rounded-b-md px-4 pt-4 pb-6">
            <p className="text-muted-foreground mb-4 text-sm md:text-base">
              Investments under Section 80C allow deductions up to ₹1,50,000 per
              year. Common instruments include ELSS, PPF, EPF, NSC, ULIPs,
              Tax-saving FDs, Life Insurance Premiums, Home Loan Principal
              repayment, etc.
            </p>
            <Card className="border-none shadow-none">
              <CardContent className="p-0">
                <Form {...form80C}>
                  <form
                    aria-labelledby="form-80c-title"
                    onSubmit={form80C.handleSubmit(onSubmit80C)}
                    className="space-y-4"
                  >
                    <h3 id="form-80c-title" className="sr-only">
                      Section 80C Calculator
                    </h3>
                    <FormField
                      control={form80C.control}
                      name="investment80C"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="investment80C">
                            Total 80C Investments (INR)
                          </FormLabel>
                          <FormControl>
                            <Input
                              id="investment80C"
                              type="number"
                              placeholder="e.g., 150000"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => handleNumberChange(field, e)}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the total amount invested in eligible 80C
                            instruments.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Calculate 80C Deduction</Button>
                  </form>
                </Form>
                {renderCalculatorResult("Section 80C Result", deduction80C)}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Section 80D */}
        <AccordionItem value="item-2">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline bg-secondary/50 px-4 rounded-t-md">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-accent" /> Section 80D (Health
              Insurance)
            </div>
          </AccordionTrigger>
          <AccordionContent className="border border-t-0 rounded-b-md px-4 pt-4 pb-6">
            <p className="text-muted-foreground mb-4 text-sm md:text-base">
              Deduction for health insurance premiums paid for self, spouse,
              dependent children, and parents. Limits vary based on age.
            </p>
            <Card className="border-none shadow-none">
              <CardContent className="p-0">
                <Form {...form80D}>
                  <form
                    aria-labelledby="form-80d-title"
                    onSubmit={form80D.handleSubmit(onSubmit80D)}
                    className="space-y-6"
                  >
                    <h3 id="form-80d-title" className="sr-only">
                      Section 80D Calculator
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <FormField
                        control={form80D.control}
                        name="premiumSelf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="premiumSelf">
                              Premium (Self, Spouse, Children)
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="premiumSelf"
                                type="number"
                                placeholder="e.g., 20000"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => handleNumberChange(field, e)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form80D.control}
                        name="isSelfSenior"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm md:p-4">
                            <FormControl>
                              <Checkbox
                                id="isSelfSenior"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel
                                htmlFor="isSelfSenior"
                                className="text-sm md:text-base"
                              >
                                Are you or your spouse a Senior Citizen (60+)?
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <FormField
                        control={form80D.control}
                        name="premiumParents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="premiumParents">
                              Premium (Parents)
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="premiumParents"
                                type="number"
                                placeholder="e.g., 30000"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => handleNumberChange(field, e)}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter 0 if not applicable.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form80D.control}
                        name="areParentsSenior"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm md:p-4">
                            <FormControl>
                              <Checkbox
                                id="areParentsSenior"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel
                                htmlFor="areParentsSenior"
                                className="text-sm md:text-base"
                              >
                                Are your parents Senior Citizens (60+)?
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit">Calculate 80D Deduction</Button>
                  </form>
                </Form>
                {renderCalculatorResult("Section 80D Result", deduction80D)}
                <p className="text-xs text-muted-foreground mt-4">
                  Max deduction: ₹{MAX_80D_SELF_NORMAL} (self, normal), ₹
                  {MAX_80D_SELF_SENIOR} (self, senior), ₹
                  {MAX_80D_PARENTS_NORMAL} (parents, normal), ₹
                  {MAX_80D_PARENTS_SENIOR} (parents, senior). Preventive health
                  checkup up to ₹5,000 included within these limits.
                </p>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* HRA Exemption */}
        <AccordionItem value="item-3">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline bg-secondary/50 px-4 rounded-t-md">
            <div className="flex items-center gap-2">
              <Home className="text-accent" /> HRA Exemption
            </div>
          </AccordionTrigger>
          <AccordionContent className="border border-t-0 rounded-b-md px-4 pt-4 pb-6">
            <p className="text-muted-foreground mb-4 text-sm md:text-base">
              House Rent Allowance (HRA) exemption can be claimed by salaried
              individuals living in rented accommodation. The exemption is the
              minimum of specific calculated amounts.
            </p>
            <Card className="border-none shadow-none">
              <CardContent className="p-0">
                <Form {...formHra}>
                  <form
                    aria-labelledby="form-hra-title"
                    onSubmit={formHra.handleSubmit(onSubmitHra)}
                    className="space-y-6"
                  >
                    <h3 id="form-hra-title" className="sr-only">
                      HRA Exemption Calculator
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <FormField
                        control={formHra.control}
                        name="basicSalary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="basicSalary">
                              Annual Basic Salary (INR)
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="basicSalary"
                                type="number"
                                placeholder="e.g., 600000"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => handleNumberChange(field, e)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={formHra.control}
                        name="da"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="da">
                              Annual DA (forming part of salary)
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="da"
                                type="number"
                                placeholder="e.g., 50000 or 0"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => handleNumberChange(field, e)}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter 0 if not applicable.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={formHra.control}
                        name="hraReceived"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="hraReceived">
                              Annual HRA Received (INR)
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="hraReceived"
                                type="number"
                                placeholder="e.g., 240000"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => handleNumberChange(field, e)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={formHra.control}
                        name="rentPaid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="rentPaid">
                              Annual Rent Paid (INR)
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="rentPaid"
                                type="number"
                                placeholder="e.g., 300000"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => handleNumberChange(field, e)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={formHra.control}
                      name="metroCity"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Do you live in a Metro City?</FormLabel>
                          <FormDescription>
                            (Delhi, Mumbai, Chennai, Kolkata)
                          </FormDescription>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value} // Use defaultValue for initial uncontrolled state if needed, though controlled is better
                              value={field.value} // Ensure value prop is set for controlled behavior
                              className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-4"
                              aria-label="Metro city status"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem id="metro-yes" value="yes" />
                                </FormControl>
                                <FormLabel
                                  htmlFor="metro-yes"
                                  className="font-normal"
                                >
                                  Yes
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem id="metro-no" value="no" />
                                </FormControl>
                                <FormLabel
                                  htmlFor="metro-no"
                                  className="font-normal"
                                >
                                  No
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit">Calculate HRA Exemption</Button>
                  </form>
                </Form>
                {renderCalculatorResult(
                  "HRA Exemption Result",
                  hraExemption,
                  "Exemption"
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card
        className="mt-8 bg-secondary border-primary/20"
        role="complementary"
      >
        <CardHeader>
          <CardTitle className="text-lg">Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            These calculators provide estimates based on the information
            provided and current tax laws (FY 2024-25). They are for
            informational purposes only.
          </p>
          <p>
            Tax laws and regulations are complex and subject to change. Consult
            with a qualified tax professional for personalized advice tailored
            to your specific situation before making any financial decisions.
          </p>
          <p>
            Remember, most deductions shown here are primarily applicable under
            the Old Tax Regime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Define props for the page component
interface DeductionsPageProps {
  params: Record<string, string | string[] | undefined>;
  searchParams: Record<string, string | string[] | undefined>;
}

// --- Main Page Component ---
export default function DeductionsPage({
  params,
  searchParams,
}: DeductionsPageProps) {
  // Explicitly use React.use if needed for params/searchParams
  // const resolvedParams = React.use(params);
  // const resolvedSearchParams = React.use(searchParams);

  // Wrap content with ProtectedRoute
  return (
    <ProtectedRoute>
      <DeductionsContent />
    </ProtectedRoute>
  );
}
