// src/app/page.tsx
"use client";

import React from "react"; // Add React import
import { useState, useEffect } from "react";
// Removed Metadata type import as it's not used in client components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Lightbulb,
  Coins,
  DollarSign,
  ReceiptText,
  FileText,
  Landmark,
  History,
  BrainCircuit,
  UserCheck,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Trash2,
  Download,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

// Define interface matching Supabase 'reports' table structure (shared with report-history)
// MUST MATCH SCHEMA.SQL
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
    suggestions: string;
    taxRegimeComparison: string;
    commonMistakes: string;
    estimatedTaxOldRegime?: number;
    estimatedTaxNewRegime?: number;
  } | null; // Nullable
  payable_tax_old?: number | null; // snake_case, Nullable
  payable_tax_new?: number | null; // snake_case, Nullable
}

// Type guard (shared with report-history) - checks basic structure
function isValidAiSuggestions(obj: any): obj is ReportData["ai_suggestions"] {
  if (!obj || typeof obj !== "object") return false;
  return (
    typeof obj.suggestions === "string" &&
    typeof obj.taxRegimeComparison === "string" &&
    typeof obj.commonMistakes === "string"
  );
}

// --- Logged-in Dashboard Component ---
function UserDashboard() {
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
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }); // Fetch all reports for the dashboard

        if (fetchError) {
          throw fetchError;
        }

        // Map data ensuring correct types and handling nulls
        const fetchedReports: ReportData[] = data.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          name: item.name || "Untitled Report",
          assessment_year: item.assessment_year || "N/A",
          income: item.income || 0,
          deductions: item.deductions || "N/A",
          investments: item.investments || "N/A",
          additional_notes: item.additional_notes, // Map snake_case from DB
          created_at: item.created_at || new Date().toISOString(),
          ai_suggestions: isValidAiSuggestions(item.ai_suggestions)
            ? item.ai_suggestions
            : null, // Null if invalid
          payable_tax_old: item.payable_tax_old, // Nullable
          payable_tax_new: item.payable_tax_new, // Nullable
        }));

        setReports(fetchedReports);
      } catch (err: any) {
        console.error("Error fetching reports for dashboard:", err);
        setError(`Failed to load recent reports. ${err.message || ""}`);
        toast({
          title: "Error",
          description: "Could not fetch recent reports.",
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

  return (
    // Use container for consistent max-width and padding
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6">
        Welcome, {user?.user_metadata?.full_name || user?.email}!
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        Your TaxSage AI Dashboard
      </p>

      {/* Quick Actions / Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="text-primary" /> Generate New Report
            </CardTitle>
            <CardDescription>Start a new tax report analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/report">
              <Button className="w-full">Create Report</Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lightbulb className="text-primary" /> Get AI Suggestions
            </CardTitle>
            <CardDescription>
              Input your details for quick AI tax advice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ai-suggestions">
              <Button className="w-full" variant="outline">
                Get Suggestions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Report History Section */}
      <section aria-labelledby="report-history-heading" className="mb-12">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle
              id="report-history-heading"
              className="flex items-center gap-3"
            >
              <History className="size-6 text-primary" />
              Report History
            </CardTitle>
            <CardDescription>
              Your saved tax reports. Click download for PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Reports</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!loading && !error && reports.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No reports generated yet.
              </p>
            )}
            {!loading && !error && reports.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {reports.map((report) => (
                  <Card
                    key={report.id}
                    className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <CardDescription>
                        AY: {report.assessment_year} | Saved:{" "}
                        {format(new Date(report.created_at), "P")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm pt-2 flex-grow space-y-2">
                      <p>
                        <strong>Income:</strong> ₹
                        {report.income.toLocaleString("en-IN")}
                      </p>
                      {/* Display Est. Tax */}
                      {(report.payable_tax_old !== null ||
                        report.payable_tax_new !== null) && (
                        <div className="text-xs mt-2 text-muted-foreground border-t pt-2">
                          <p className="flex items-center gap-1">
                            <Coins size={14} /> Est. Tax:
                          </p>
                          <p className="pl-2">
                            Old: ₹
                            {report.payable_tax_old?.toLocaleString("en-IN") ??
                              "N/A"}
                          </p>
                          <p className="pl-2">
                            New: ₹
                            {report.payable_tax_new?.toLocaleString("en-IN") ??
                              "N/A"}
                          </p>
                        </div>
                      )}
                      {/* Indicators */}
                      {report.ai_suggestions && (
                        <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                          Includes AI Analysis
                        </p>
                      )}
                      {report.additional_notes && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Has Notes
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPdf(report)}
                      >
                        <Download className="mr-1 h-4 w-4" /> Download
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isDeleting === report.id}
                          >
                            {isDeleting === report.id ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-1 h-4 w-4" />
                            )}
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will permanently delete the report: "
                              {report.name}" (AY {report.assessment_year}).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              disabled={isDeleting === report.id}
                            >
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
          </CardContent>
          {reports.length > 0 && (
            <CardFooter className="pt-4 border-t mt-4">
              <Link href="/report-history" className="w-full">
                <Button variant="outline" className="w-full">
                  View Full Report History <History className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          )}
        </Card>
      </section>
    </div>
  );
}

// --- Public Marketing Content Component ---
function PublicHomePage() {
  // SEO: Add structured data for FAQ
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is TaxSage AI?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "TaxSage AI is an AI-powered application designed to help Indian taxpayers with tax planning. It offers personalized tax-saving suggestions, compares the old and new tax regimes (FY 2024-25), provides calculators for common deductions (like 80C, 80D, HRA), and allows users to generate and save comprehensive tax reports.",
        },
      },
      {
        "@type": "Question",
        name: "How is TaxSage AI different from other tax calculators?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "TaxSage AI goes beyond basic calculations by leveraging Artificial Intelligence. It analyzes your specific financial inputs (income, deductions, investments) to provide personalized, actionable strategies. It also helps you compare the nuances of the old vs. new tax regimes and highlights common mistakes to avoid, offering a more tailored and insightful planning experience.",
        },
      },
      {
        "@type": "Question",
        name: "Is TaxSage AI up-to-date with the latest tax laws?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, TaxSage AI is updated for the Financial Year 2024-25 (Assessment Year 2025-26) tax regulations in India, including the latest tax slabs, deduction limits, and surcharge rules for both the new (default) and old tax regimes.",
        },
      },
      {
        "@type": "Question",
        name: "Is TaxSage AI a substitute for professional tax advice?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No, TaxSage AI provides informational suggestions and estimates for planning purposes only. Tax laws are complex and individual situations vary. We strongly recommend consulting with a qualified tax professional for personalized advice before making any financial decisions.",
        },
      },
    ],
  };

  return (
    // Use default background for consistency
    <div className="flex flex-col min-h-screen">
      {/* SEO: Inject JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 lg:py-32 text-center">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
          <BrainCircuit className="mr-2 h-4 w-4" /> AI-Powered Tax Planning
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-6">
          Navigate Your Taxes Smarter with TaxSage AI
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl md:max-w-3xl mx-auto mb-8">
          Get personalized, AI-driven tax-saving strategies, understand complex
          rules, estimate your tax liability, and generate insightful reports
          effortlessly. Stop guessing, start optimizing.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">Get Started Free</Button>
          </Link>
          {/* Updated link to always point to /report, relies on ProtectedRoute for redirect */}
          <Link href="/report">
            <Button size="lg" variant="outline">
              Generate a Report
            </Button>
          </Link>
        </div>
        {/* Removed login required text */}
      </section>

      {/* Features Section */}
      <section
        aria-labelledby="features-heading"
        className="container mx-auto px-4 py-16 md:py-20 lg:py-24"
      >
        <h2
          id="features-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12"
        >
          Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <FeatureCard
            icon={<Lightbulb className="text-accent size-8 mb-4" />}
            title="AI Tax Suggestions"
            description="Receive personalized strategies based on your income, deductions, and investments. Compare tax regimes effectively."
            link="/ai-suggestions"
            requireLogin={true}
          />
          <FeatureCard
            icon={<ReceiptText className="text-accent size-8 mb-4" />}
            title="Deductions Guide"
            description="Explore common deductions (80C, 80D, HRA) with easy-to-use calculators for the Old Tax Regime."
            link="/deductions"
            requireLogin={true} // Updated: Now requires login
          />
          <FeatureCard
            icon={<FileText className="text-accent size-8 mb-4" />}
            title="Comprehensive Reports"
            description="Generate detailed PDF reports including your inputs, estimated taxes, and AI analysis. Save securely."
            link="/report"
            requireLogin={true}
          />
          <FeatureCard
            icon={<Coins className="text-accent size-8 mb-4" />}
            title="Updated Tax Slabs"
            description="Stay informed with the latest income tax slabs for both New and Old Regimes (FY 2024-25)."
            link="/tax-slabs"
            requireLogin={true} // Updated: Now requires login
          />
          <FeatureCard
            icon={<DollarSign className="text-accent size-8 mb-4" />}
            title="Surcharge & STC Info"
            description="Understand how surcharge impacts high earners and get clarity on Short Term Capital Gains tax."
            link="/surcharge"
            requireLogin={true}
          />
          <FeatureCard
            icon={<History className="text-accent size-8 mb-4" />}
            title="Report History"
            description="Logged-in users can securely access, review, estimate taxes for, and download all previously generated reports."
            link="/report-history"
            requireLogin={true}
          />
        </div>
      </section>

      {/* Why Choose Us Section - Uses container like Features */}
      <section
        aria-labelledby="why-choose-us-heading"
        className="container mx-auto px-4 py-16 md:py-20 lg:py-24"
      >
        <div className="text-center">
          <h2
            id="why-choose-us-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
          >
            Why Choose TaxSage AI?
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-12 max-w-lg md:max-w-2xl mx-auto">
            Go beyond basic calculators. We leverage AI to provide actionable
            insights tailored to you.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <WhyCard
            icon={<BrainCircuit className="text-primary size-10" />}
            title="Intelligent Insights"
            description="Our AI doesn't just calculate; it analyzes your data to find optimal saving opportunities and warns against common mistakes."
          />
          <WhyCard
            icon={<UserCheck className="text-primary size-10" />}
            title="Personalized Experience"
            description="Get advice and comparisons relevant to YOUR financial situation, not generic rules. Save reports securely under your profile."
          />
          <WhyCard
            icon={<ShieldCheck className="text-primary size-10" />}
            title="Secure & Up-to-Date"
            description="Built with security in mind and updated for the latest tax regulations (FY 2024-25), ensuring reliable information."
          />
        </div>
      </section>

      {/* Footer removed, handled by MainLayout */}
    </div>
  );
}

// Helper component for Feature Cards
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  requireLogin?: boolean;
}

function FeatureCard({
  icon,
  title,
  description,
  link,
  requireLogin = false,
}: FeatureCardProps) {
  const { user } = useAuth();
  // Redirect logic is handled by ProtectedRoute on the target page,
  // so the button should always link directly. No need to disable or change link based on auth here.
  // const isDisabled = requireLogin && !user; // No longer needed for disabling
  // const targetLink = isDisabled ? '/login' : link; // Link always points to the feature page

  return (
    // Removed disabled styles and conditional opacity/cursor
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="items-center text-center pb-4">
        {icon}
        <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow text-center pt-0 pb-4">
        <p className="text-sm md:text-base text-muted-foreground mb-4">
          {description}
        </p>
        {/* Removed login required text */}
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto">
        {/* Link always points to the feature page. ProtectedRoute handles auth check. */}
        <Link href={link} className="w-full">
          <Button variant="outline" className="w-full">
            Learn More {/* Button text always shows "Learn More" */}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// Helper component for Why Choose Us Cards - Uses ShadCN Card for consistency
interface WhyCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function WhyCard({ icon, title, description }: WhyCardProps) {
  return (
    // Use Card component for consistent styling with FeatureCard
    <Card className="flex flex-col items-center text-center hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="items-center pb-4">
        {icon}
        <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow pt-0 pb-6">
        <p className="text-sm md:text-base text-muted-foreground">
          {description}
        </p>
      </CardContent>
      {/* No CardFooter needed for WhyCard */}
    </Card>
  );
}

// Define props for the Home page component to satisfy Next.js requirements
interface HomeProps {
  params?: Record<string, string | string[] | undefined>; // Make optional
  searchParams?: Record<string, string | string[] | undefined>; // Make optional
}

// --- Main Page Component ---
export default function Home({ params, searchParams }: HomeProps) {
  // Explicitly use React.use if needed for params/searchParams, although they are not used here
  // const resolvedParams = React.use(params);
  // const resolvedSearchParams = React.use(searchParams);

  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        {" "}
        {/* Adjusted min-height */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <UserDashboard /> : <PublicHomePage />;
}
