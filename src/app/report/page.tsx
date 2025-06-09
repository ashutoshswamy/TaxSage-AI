// src/app/report/page.tsx
"use client";

import React from "react"; // Add React import
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import jsPDF from "jspdf";
import { supabase } from "@/lib/supabase"; // Import Supabase client
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  FileText,
  Download,
  Loader2,
  AlertTriangle,
  Save,
  Coins,
} from "lucide-react"; // Added Coins icon
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getTaxSavingSuggestions,
  type TaxSavingSuggestionsInput,
  type TaxSavingSuggestionsOutput,
} from "@/ai/flows/tax-saving-suggestions";
import { useAuth } from "@/context/AuthContext";
import { calculateTaxPayable } from "@/lib/taxUtils"; // Import tax calculation utility
import ProtectedRoute from "@/components/ProtectedRoute"; // Import ProtectedRoute

// SEO: Metadata cannot be exported from client components.

// Schema for report form data - MUST MATCH SCHEMA.SQL
const reportSchema = z.object({
  name: z.string().min(1, "Name is required"),
  assessment_year: z // Use assessment_year to match DB
    .string()
    .regex(/^\d{4}-\d{2}$/, "Format must be YYYY-YY (e.g., 2025-26)"),
  income: z.coerce
    .number({ invalid_type_error: "Income must be a number" })
    .positive({ message: "Income must be a positive number" }),
  deductions: z // Renamed from deductionsInput to match DB
    .string()
    .min(1, { message: "Please list applicable deductions or N/A" }), // Allow N/A
  investments: z // Renamed from investmentsInput to match DB
    .string()
    .min(1, { message: "Please list your investments or N/A" }), // Allow N/A
  additional_notes: z.string().optional(), // Matches DB column name
});

type ReportFormData = z.infer<typeof reportSchema>;

// Define the structure for Supabase 'reports' table - MUST MATCH SCHEMA.SQL
interface ReportDataForSupabase {
  user_id: string;
  name: string;
  assessment_year: string; // snake_case
  income: number;
  deductions: string;
  investments: string;
  additional_notes?: string | null; // snake_case
  ai_suggestions?: TaxSavingSuggestionsOutput | null; // Nullable
  payable_tax_old?: number | null; // snake_case, Nullable
  payable_tax_new?: number | null; // snake_case, Nullable
}

function ReportContent() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiSuggestions, setAiSuggestions] =
    useState<TaxSavingSuggestionsOutput | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const { toast } = useToast();
  const [clientTimestamp, setClientTimestamp] = useState<string>("");
  const { user } = useAuth();
  const [calculatedTaxes, setCalculatedTaxes] = useState<{
    old: number;
    new: number;
  } | null>(null);

  useEffect(() => {
    setClientTimestamp(new Date().toLocaleString());
  }, []);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      name: "",
      assessment_year: "2025-26", // Use assessment_year for form default
      income: undefined, // Initialize as undefined for controlled input
      deductions: "", // Use deductions for form default
      investments: "", // Use investments for form default
      additional_notes: "", // Use snake_case for form default
    },
  });

  // --- Helper function to estimate deductions (can be improved) ---
  // This is a simple parser, needs improvement for accuracy
  function estimateTotalDeductions(deductionString: string): number {
    if (!deductionString || deductionString.toLowerCase() === "n/a") return 0;

    let total = 0;
    const deductions = deductionString.split(",").map((d) => d.trim());
    const standardDeduction = 50000; // Assuming applicable for old regime salary
    let standardDeductionCovered = false;

    deductions.forEach((d) => {
      const parts = d.split(":").map((p) => p.trim());
      if (parts.length === 2) {
        const section = parts[0].toUpperCase();
        const amount = parseFloat(parts[1].replace(/[^0-9.]/g, ""));
        if (!isNaN(amount)) {
          if (section === "80C") total += Math.min(amount, 150000);
          else if (section === "80D")
            total += Math.min(amount, 75000); // Needs age context
          else if (section === "NPS" || section.includes("80CCD(1B)"))
            total += Math.min(amount, 50000);
          else if (section === "STD DED" || section === "STANDARD DEDUCTION") {
            total += Math.min(amount, standardDeduction); // Add explicitly mentioned amount
            standardDeductionCovered = true;
          } else total += amount;
        }
      } else if (d) {
        // Handle non-key-value pairs
        if (d.toLowerCase().includes("80c")) total += 150000; // Assume max
        else if (d.toLowerCase().includes("80d"))
          total += 25000; // Assume basic min
        else if (
          d.toLowerCase().includes("nps") ||
          d.toLowerCase().includes("80ccd(1b)")
        )
          total += 50000; // Assume max additional NPS
        else if (d.toLowerCase().includes("standard deduction"))
          standardDeductionCovered = true;
        // HRA requires more info, ignore for direct sum estimation
      }
    });

    // Add Standard Deduction if not explicitly mentioned/covered and income suggests salaried
    // A better approach might involve asking the user if they are salaried.
    if (!standardDeductionCovered && form.getValues("income") > 50000) {
      total += standardDeduction;
    }

    return total;
  }

  // Fetch AI Suggestions
  const fetchAiSuggestions = async (
    input: TaxSavingSuggestionsInput
  ): Promise<TaxSavingSuggestionsOutput | null> => {
    setAiError(null);
    setAiSuggestions(null);
    try {
      // Pass calculated taxes to AI if available
      const result = await getTaxSavingSuggestions(input);
      setAiSuggestions(result);
      // Update calculated taxes based on AI response if estimates are included
      if (
        result.estimatedTaxOldRegime !== undefined &&
        result.estimatedTaxNewRegime !== undefined
      ) {
        setCalculatedTaxes({
          old: result.estimatedTaxOldRegime,
          new: result.estimatedTaxNewRegime,
        });
      }
      toast({
        title: "AI Analysis Complete",
        description: "AI suggestions have been fetched.",
      });
      return result;
    } catch (err) {
      console.error("Error fetching AI suggestions for report:", err);
      const message =
        err instanceof Error ? err.message : "An unknown AI error occurred.";
      setAiError(`Failed to get AI suggestions: ${message}`);
      toast({
        title: "AI Suggestion Error",
        description: `Could not fetch AI suggestions. Report can still be generated/saved. Error: ${message}`,
        variant: "destructive",
      });
      return null;
    }
  };

  // Save Report to Supabase
  const saveReportToSupabase = async (
    formData: ReportFormData,
    suggestions: TaxSavingSuggestionsOutput | null,
    taxes: { old: number; new: number } | null
  ) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save reports.",
        variant: "destructive",
      });
      return false;
    }
    setIsSaving(true);
    try {
      const notesToSend =
        formData.additional_notes?.trim() === ""
          ? null
          : formData.additional_notes;

      // Prepare data matching Supabase schema (snake_case)
      const reportData: ReportDataForSupabase = {
        user_id: user.id,
        name: formData.name,
        assessment_year: formData.assessment_year, // Correct mapping
        income: formData.income,
        deductions: formData.deductions, // Correct mapping
        investments: formData.investments, // Correct mapping
        additional_notes: notesToSend, // Correct mapping
        ai_suggestions: suggestions, // Nullable in schema
        payable_tax_old: taxes?.old ?? null, // Nullable in schema
        payable_tax_new: taxes?.new ?? null, // Nullable in schema
      };

      const { data, error } = await supabase
        .from("reports")
        .insert([reportData])
        .select();

      if (error) {
        // Log the full error object for better debugging
        console.error(
          "Error saving report to Supabase:",
          JSON.stringify(error, null, 2)
        );
        const errorMessage =
          error?.message ||
          "An unknown error occurred. Please check console or Supabase logs.";
        toast({
          title: "Save Error",
          description: `Failed to save the report. ${errorMessage}`,
          variant: "destructive",
        });
        throw error; // Re-throw the specific Supabase error
      }

      // Improved Toast Message on Success
      toast({
        title: "Report Saved Successfully!",
        description: (
          <div className="space-y-1">
            <p>Report "{formData.name}" saved.</p>
            {taxes && (
              <>
                <p>Est. Tax (Old): ₹{taxes.old.toLocaleString("en-IN")}</p>
                <p>Est. Tax (New): ₹{taxes.new.toLocaleString("en-IN")}</p>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              You can view it in Report History.
            </p>
            {suggestions && (
              <p className="text-xs text-green-600">AI analysis included.</p>
            )}
          </div>
        ),
        duration: 7000, // Show longer
      });
      return true;
    } catch (error: any) {
      // Avoid double logging if already caught Supabase error
      if (!error?.message?.includes("Save Error")) {
        console.error(
          "Generic Error saving report:",
          JSON.stringify(error, null, 2)
        );
        const errorMessage =
          error?.message || "An unknown error occurred during saving.";
        toast({
          title: "Save Error",
          description: `Failed to save the report. ${errorMessage}`,
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Generate PDF function
  const generatePdf = (
    data: ReportFormData,
    suggestions?: TaxSavingSuggestionsOutput | null, // Allow null
    taxes?: { old: number; new: number } | null // Allow null
  ) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let yPos = margin;

    const addText = (
      text: string | number | null | undefined,
      x: number,
      y: number,
      options?: any,
      size = 10,
      isBold = false
    ) => {
      let displayText =
        text === null || text === undefined ? "N/A" : String(text);
      if (typeof displayText !== "string") displayText = String(displayText);

      doc.setFontSize(size);
      doc.setFont(undefined, isBold ? "bold" : "normal");
      const splitText = doc.splitTextToSize(
        displayText,
        pageWidth - margin * 2 - (x - margin)
      );
      const textHeight = doc.getTextDimensions(splitText).h;

      if (y + textHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        y = yPos;
        doc.setFontSize(18);
        doc.setFont(undefined, "bold");
        doc.setTextColor(0, 128, 128); // Teal color
        doc.text("TaxSage AI - Tax Report", pageWidth / 2, yPos, {
          align: "center",
        });
        doc.setTextColor(0, 0, 0); // Reset color
        yPos += 10;
        y = yPos;
      }

      doc.text(splitText, x, y, options);
      const newYPos = y + textHeight + 2;
      if (newYPos > yPos) {
        yPos = newYPos;
      }
      return newYPos;
    };

    // --- Header ---
    let currentY = addText(
      "TaxSage AI - Tax Report",
      pageWidth / 2,
      yPos,
      { align: "center" },
      18,
      true
    );
    doc.setTextColor(0, 0, 0);
    currentY += 5;

    // --- Report Metadata ---
    currentY = addText(
      `Report Generated: ${clientTimestamp || "N/A"}`,
      margin,
      currentY,
      {},
      8
    );
    currentY = addText(`Name: ${data.name}`, margin, currentY, {}, 12, true);
    currentY = addText(
      `Assessment Year: ${data.assessment_year}`,
      margin,
      currentY,
      {},
      12,
      true
    );
    currentY += 5;
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
    yPos = currentY;

    // --- Financial Inputs ---
    currentY = addText(
      "Financial Information Provided:",
      margin,
      yPos,
      {},
      14,
      true
    );
    currentY = addText(
      `Annual Income: ₹${data.income.toLocaleString("en-IN")}`,
      margin,
      currentY,
      {},
      10
    );
    currentY = addText(
      `Deductions Claimed/Considered: ${data.deductions}`,
      margin,
      currentY,
      {},
      10
    );
    currentY = addText(
      `Investments Made: ${data.investments}`,
      margin,
      currentY,
      {},
      10
    );
    currentY += 5;
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
    yPos = currentY;

    // --- Estimated Tax ---
    if (taxes) {
      currentY = addText(
        "Estimated Tax Payable (FY 2024-25):",
        margin,
        yPos,
        {},
        14,
        true
      );
      currentY = addText(
        `Old Regime: ₹${taxes.old.toLocaleString("en-IN")}`,
        margin,
        currentY,
        {},
        10
      );
      currentY = addText(
        `New Regime (Default): ₹${taxes.new.toLocaleString("en-IN")}`,
        margin,
        currentY,
        {},
        10
      );
      currentY += 5;
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;
      yPos = currentY;
    }

    // --- AI Suggestions ---
    if (suggestions) {
      currentY = addText("AI Tax Analysis:", margin, yPos, {}, 14, true);
      currentY = addText(
        "Personalized Suggestions:",
        margin,
        currentY,
        {},
        12,
        true
      );
      currentY = addText(
        suggestions.suggestions || "N/A",
        margin,
        currentY,
        {},
        10
      );
      currentY += 3;
      currentY = addText(
        "Tax Regime Comparison:",
        margin,
        currentY,
        {},
        12,
        true
      );
      currentY = addText(
        suggestions.taxRegimeComparison || "N/A",
        margin,
        currentY,
        {},
        10
      );
      currentY += 3;
      currentY = addText(
        "Common Mistakes & Warnings:",
        margin,
        currentY,
        {},
        12,
        true
      );
      currentY = addText(
        suggestions.commonMistakes || "N/A",
        margin,
        currentY,
        {},
        10
      );
      currentY += 5;
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;
      yPos = currentY;
    } else if (aiError) {
      currentY = addText("AI Tax Analysis:", margin, yPos, {}, 14, true);
      currentY = addText(
        `Error fetching AI suggestions: ${aiError}`,
        margin,
        currentY,
        { textColor: [255, 0, 0] },
        10
      );
      currentY += 5;
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;
      yPos = currentY;
    }

    // --- Additional Notes ---
    if (data.additional_notes) {
      currentY = addText("Additional Notes:", margin, yPos, {}, 14, true);
      currentY = addText(data.additional_notes, margin, currentY, {}, 10);
      currentY += 5;
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;
      yPos = currentY;
    }

    // --- Disclaimer ---
    currentY = addText("Disclaimer:", margin, yPos, {}, 10, true);
    currentY = addText(
      "This report is generated based on user-provided data and AI analysis (if available). Estimated tax figures are based on standard calculations for FY 2024-25 and may not account for all specific circumstances or deductions. It is for informational purposes only and does not constitute financial or tax advice. Consult a qualified tax professional for personalized guidance.",
      margin,
      currentY,
      {},
      8
    );

    // --- Save PDF ---
    doc.save(
      `TaxSageAI_Report_${data.name.replace(/\s+/g, "_")}_${
        data.assessment_year
      }.pdf`
    );
  };

  // Handles fetching AI data, calculating tax, and then either saving or generating PDF
  async function handleReportAction(
    values: ReportFormData,
    action: "save" | "download"
  ) {
    // User check is now handled by ProtectedRoute, but keep for safety if needed
    if (!user && action === "save") {
      toast({
        title: "Login Required",
        description: "Please log in to save reports.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(action === "download");
    setIsSaving(action === "save"); // Set saving state
    setCalculatedTaxes(null); // Reset previous tax calculation

    // Calculate taxes first
    const estimatedDeductionsOld = estimateTotalDeductions(values.deductions);
    const taxOld = calculateTaxPayable(
      values.income,
      estimatedDeductionsOld,
      "old"
    );
    const taxNew = calculateTaxPayable(values.income, 0, "new");
    const currentTaxes = { old: taxOld.totalTax, new: taxNew.totalTax };
    setCalculatedTaxes(currentTaxes);

    const aiInput: TaxSavingSuggestionsInput = {
      income: values.income,
      deductions: values.deductions,
      investments: values.investments,
    };

    // Fetch AI suggestions (now includes tax estimates in the prompt)
    const fetchedSuggestions = await fetchAiSuggestions(aiInput);

    // Perform the requested action
    if (action === "save") {
      await saveReportToSupabase(values, fetchedSuggestions, currentTaxes);
    } else if (action === "download") {
      try {
        generatePdf(values, fetchedSuggestions, currentTaxes);
        // Improved Toast Message for Download
        toast({
          title: "Report Generated & Downloaded",
          description: (
            <div className="space-y-1">
              <p>Your PDF report has started downloading.</p>
              {currentTaxes && (
                <>
                  <p>
                    Est. Tax (Old): ₹{currentTaxes.old.toLocaleString("en-IN")}
                  </p>
                  <p>
                    Est. Tax (New): ₹{currentTaxes.new.toLocaleString("en-IN")}
                  </p>
                </>
              )}
              {fetchedSuggestions && (
                <p className="text-xs text-green-600">Includes AI analysis.</p>
              )}
            </div>
          ),
          duration: 7000,
        });
      } catch (pdfError) {
        console.error("PDF Generation Error:", pdfError);
        toast({
          title: "PDF Error",
          description: "Failed to generate the PDF report. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false); // Reset generating state only for download
      }
    }

    // Reset loading states if not already done
    if (action === "save") {
      setIsSaving(false);
    }
  }

  return (
    // Add container class for padding and max-width
    <div className="container mx-auto space-y-8 p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-3">
        <FileText className="size-8" />
        Generate Tax Report
      </h1>
      <p className="text-muted-foreground text-lg">
        Compile your financial details, calculate estimated tax, optionally
        fetch AI suggestions, and save or download the report.
      </p>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>
            Fill in the necessary information. Estimated taxes for both regimes
            (FY 2024-25) will be calculated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              id="report-form"
              onSubmit={(e) => e.preventDefault()}
              className="space-y-6"
            >
              {/* Form Fields - Use DB column names (snake_case where applicable) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="name">Report Name</FormLabel>
                      <FormControl>
                        <Input
                          id="name"
                          placeholder="e.g., My Tax Report 2025"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assessment_year" // Matches schema
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="assessment_year">
                        Assessment Year (AY)
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="assessment_year"
                          placeholder="YYYY-YY (e.g., 2025-26)"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Typically Fiscal Year + 1.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="income"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="income">
                      Annual Gross Income (INR)
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="income"
                        type="number"
                        placeholder="e.g., 1500000"
                        {...field}
                        // Handle undefined case for controlled input
                        value={field.value === undefined ? "" : field.value}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Ensure value is number or undefined, not NaN
                          const numValue = Number(value);
                          field.onChange(
                            value === "" || isNaN(numValue)
                              ? undefined
                              : numValue
                          );
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Your total income before any deductions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deductions" // Matches schema
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="deductions">
                      Deductions Claimed/Considered
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="deductions"
                        placeholder="e.g., 80C: 150000, 80D: 25000, HRA, Standard Deduction, or N/A"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      List deductions (use amounts like '80C: 1.5L' if known).
                      Used for Old Regime tax estimate & AI. Enter 'N/A' if
                      none.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="investments" // Matches schema
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="investments">
                      Tax-Saving Investments Made
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="investments"
                        placeholder="e.g., ELSS, PPF, NPS, Health Insurance Premium, or N/A"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      List relevant investments, separated by commas. Used for
                      AI input. Enter 'N/A' if none.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additional_notes" // Matches schema
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="additional_notes">
                      Additional Notes (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        id="additional_notes"
                        placeholder="Add any specific details or comments for the report..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        value={field.value ?? ""} // Ensure value is never undefined
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display Calculated Taxes */}
              {calculatedTaxes && (
                <Alert variant="default" className="bg-secondary">
                  <Coins className="h-4 w-4" />
                  <AlertTitle>Estimated Tax (FY 2024-25)</AlertTitle>
                  <AlertDescription>
                    <p>
                      Old Regime: ₹{calculatedTaxes.old.toLocaleString("en-IN")}
                    </p>
                    <p>
                      New Regime (Default): ₹
                      {calculatedTaxes.new.toLocaleString("en-IN")}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {aiError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>AI Analysis Error</AlertTitle>
                  <AlertDescription>{aiError}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button
                  type="button"
                  onClick={form.handleSubmit((values) =>
                    handleReportAction(values, "save")
                  )}
                  disabled={isSaving || isGenerating} // Removed !user check as it's handled by ProtectedRoute
                  title={!user ? "Login to save reports" : ""}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Report
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={form.handleSubmit((values) =>
                    handleReportAction(values, "download")
                  )}
                  disabled={isGenerating || isSaving}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
              {/* Removed redundant login prompt */}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// Define props for the page component
interface ReportPageProps {
  params: Record<string, string | string[] | undefined>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function ReportPage({ params, searchParams }: ReportPageProps) {
  // Explicitly use React.use if needed for params/searchParams
  // const resolvedParams = React.use(params);
  // const resolvedSearchParams = React.use(searchParams);

  // Wrap ReportContent with ProtectedRoute
  return (
    <ProtectedRoute>
      <ReportContent />
    </ProtectedRoute>
  );
}
