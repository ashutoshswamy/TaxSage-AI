// src/app/report-history/page.tsx
"use client";

import React from "react"; // Add React import
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Import Supabase client
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  FileText,
  AlertTriangle,
  Trash2,
  Download,
  Coins,
} from "lucide-react"; // Added Coins
import { format } from "date-fns";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link"; // Import Link

// SEO: Metadata cannot be exported from client components.

// Define interface matching Supabase 'reports' table structure - MUST MATCH SCHEMA.SQL
interface ReportData {
  id: string;
  user_id: string;
  name: string;
  assessment_year: string; // snake_case
  income: number;
  deductions: string;
  investments: string;
  additional_notes?: string | null; // snake_case
  created_at: string;
  ai_suggestions?: {
    // Matches JSONB column name
    suggestions: string;
    taxRegimeComparison: string;
    commonMistakes: string;
    // AI output might also include its own estimates, but we prioritize calculated ones
    estimatedTaxOldRegime?: number;
    estimatedTaxNewRegime?: number;
  } | null; // Nullable
  payable_tax_old?: number | null; // snake_case, Nullable
  payable_tax_new?: number | null; // snake_case, Nullable
}

// Type guard to check if ai_suggestions is valid (only checks structure, not values)
function isValidAiSuggestions(obj: any): obj is ReportData["ai_suggestions"] {
  if (!obj || typeof obj !== "object") return false;
  // Check required fields, allow optional tax estimates
  return (
    typeof obj.suggestions === "string" &&
    typeof obj.taxRegimeComparison === "string" &&
    typeof obj.commonMistakes === "string"
  );
}

function ReportHistoryContent() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("reports")
          .select("*") // Select all columns
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        // Map data, ensuring correct types and column names
        const fetchedReports: ReportData[] = data.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          name: item.name || "Untitled Report",
          assessment_year: item.assessment_year || "N/A",
          income: item.income || 0,
          deductions: item.deductions || "N/A",
          investments: item.investments || "N/A",
          additional_notes: item.additional_notes,
          created_at: item.created_at || new Date().toISOString(),
          ai_suggestions: isValidAiSuggestions(item.ai_suggestions)
            ? item.ai_suggestions
            : null, // Assign null if invalid
          payable_tax_old: item.payable_tax_old, // Map directly (nullable)
          payable_tax_new: item.payable_tax_new, // Map directly (nullable)
        }));

        setReports(fetchedReports);
      } catch (err: any) {
        console.error("Error fetching reports:", err);
        setError(`Failed to load report history. ${err.message || ""}`);
        toast({
          title: "Error",
          description: "Could not fetch report history.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, toast]);

  const handleDeleteReport = async (reportId: string) => {
    setIsDeleting(reportId);
    try {
      const { error: deleteError } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId)
        .eq("user_id", user?.id);

      if (deleteError) {
        throw deleteError;
      }

      setReports((prevReports) =>
        prevReports.filter((report) => report.id !== reportId)
      );
      toast({
        title: "Report Deleted",
        description: "The report has been successfully deleted.",
      });
    } catch (err: any) {
      console.error("Error deleting report:", err);
      setError(`Failed to delete report ${reportId}. ${err.message || ""}`);
      toast({
        title: "Error",
        description: "Failed to delete the report.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // PDF generation logic including payable tax
  const downloadPdf = (report: ReportData) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let yPos = margin;
    const reportTimestamp = report.created_at
      ? format(new Date(report.created_at), "PPpp")
      : "N/A";

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
        doc.setTextColor(0, 128, 128);
        doc.text("TaxSage AI - Tax Report", pageWidth / 2, yPos, {
          align: "center",
        });
        doc.setTextColor(0, 0, 0);
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

    // --- PDF Content ---
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

    currentY = addText(
      `Report Saved: ${reportTimestamp}`,
      margin,
      currentY,
      {},
      8
    );
    currentY = addText(`Name: ${report.name}`, margin, currentY, {}, 12, true);
    currentY = addText(
      `Assessment Year: ${report.assessment_year}`,
      margin,
      currentY,
      {},
      12,
      true
    );
    currentY += 5;
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
    yPos = currentY;

    currentY = addText(
      "Financial Information Provided:",
      margin,
      yPos,
      {},
      14,
      true
    );
    currentY = addText(
      `Annual Income: ₹${report.income.toLocaleString("en-IN")}`,
      margin,
      currentY,
      {},
      10
    );
    currentY = addText(
      `Deductions Claimed/Considered: ${report.deductions || "N/A"}`,
      margin,
      currentY,
      {},
      10
    );
    currentY = addText(
      `Investments Made: ${report.investments || "N/A"}`,
      margin,
      currentY,
      {},
      10
    );
    currentY += 5;
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
    yPos = currentY;

    // --- Estimated Tax Payable ---
    if (report.payable_tax_old !== null || report.payable_tax_new !== null) {
      currentY = addText(
        "Estimated Tax Payable (FY 2024-25):",
        margin,
        yPos,
        {},
        14,
        true
      );
      currentY = addText(
        `Old Regime: ₹${
          report.payable_tax_old?.toLocaleString("en-IN") ?? "N/A"
        }`,
        margin,
        currentY,
        {},
        10
      );
      currentY = addText(
        `New Regime (Default): ₹${
          report.payable_tax_new?.toLocaleString("en-IN") ?? "N/A"
        }`,
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

    if (report.ai_suggestions) {
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
        report.ai_suggestions.suggestions || "N/A",
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
        report.ai_suggestions.taxRegimeComparison || "N/A",
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
        report.ai_suggestions.commonMistakes || "N/A",
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

    if (report.additional_notes) {
      currentY = addText("Additional Notes:", margin, yPos, {}, 14, true);
      currentY = addText(report.additional_notes, margin, currentY, {}, 10);
      currentY += 5;
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;
      yPos = currentY;
    }

    currentY = addText("Disclaimer:", margin, yPos, {}, 10, true);
    currentY = addText(
      "This report was generated based on user-provided data and AI analysis (if available). Estimated tax figures are based on standard calculations for FY 2024-25 and may not account for all specific circumstances or deductions. It is for informational purposes only. Consult a qualified tax professional.",
      margin,
      currentY,
      {},
      8
    );

    doc.save(
      `TaxSageAI_Report_${report.name.replace(/\s+/g, "_")}_${
        report.assessment_year
      }.pdf`
    );
    toast({
      title: "Download Started",
      description: "Your report PDF is downloading.",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      // Add container class
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    // Add container class for consistent padding and max-width
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-3">
        <FileText className="size-8" />
        Report History
      </h1>
      <p className="text-muted-foreground text-lg">
        View and manage your previously saved tax reports.
      </p>

      {reports.length === 0 ? (
        <Card className="text-center shadow-md p-6">
          <CardHeader>
            <CardTitle>No Reports Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You haven't saved any reports yet.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/report" passHref className="mx-auto">
              <Button>Generate a New Report</Button>
            </Link>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg md:text-xl">
                  {report.name}
                </CardTitle>
                <CardDescription>
                  AY: {report.assessment_year} <br />
                  Saved:{" "}
                  {report.created_at
                    ? format(new Date(report.created_at), "PPpp")
                    : "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm pt-2 pb-4 flex-grow space-y-2">
                <p>
                  <strong>Income:</strong> ₹
                  {report.income.toLocaleString("en-IN")}
                </p>
                {/* Display Estimated Taxes */}
                {(report.payable_tax_old !== null ||
                  report.payable_tax_new !== null) && (
                  <div className="text-xs mt-2 text-muted-foreground border-t pt-2">
                    <p className="flex items-center gap-1">
                      <Coins size={14} /> Est. Tax:
                    </p>
                    <p className="pl-2">
                      Old: ₹
                      {report.payable_tax_old?.toLocaleString("en-IN") ?? "N/A"}
                    </p>
                    <p className="pl-2">
                      New: ₹
                      {report.payable_tax_new?.toLocaleString("en-IN") ?? "N/A"}
                    </p>
                  </div>
                )}
                {/* AI Analysis Indicator */}
                {report.ai_suggestions && (
                  <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                    Includes AI Analysis
                  </p>
                )}
                {report.additional_notes && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Has Notes
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadPdf(report)}
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isDeleting === report.id}
                      className="w-full sm:w-auto"
                    >
                      {isDeleting === report.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the report "{report.name}" (AY{" "}
                        {report.assessment_year}).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting === report.id}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteReport(report.id)}
                        disabled={isDeleting === report.id}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting === report.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Yes, delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Define props for the page component
interface ReportHistoryPageProps {
  params: Record<string, string | string[] | undefined>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function ReportHistoryPage({
  params,
  searchParams,
}: ReportHistoryPageProps) {
  // Explicitly use React.use if needed for params/searchParams
  // const resolvedParams = React.use(params);
  // const resolvedSearchParams = React.use(searchParams);

  return (
    <ProtectedRoute>
      <ReportHistoryContent />
    </ProtectedRoute>
  );
}
