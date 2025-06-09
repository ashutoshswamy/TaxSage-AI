"use client";

import React from "react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// Import custom table components to avoid whitespace hydration issues
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Update path based on where you save the custom table component

// Define tax slab types
interface TaxSlab {
  incomeRange: string;
  taxRate: string;
  description?: string;
}

// Define tax slabs for both regimes
const oldRegimeSlabs: TaxSlab[] = [
  {
    incomeRange: "Up to ₹2,50,000",
    taxRate: "Nil",
    description: "Basic exemption limit",
  },
  {
    incomeRange: "₹2,50,001 to ₹5,00,000",
    taxRate: "5%",
    description: "After rebate under Section 87A if applicable",
  },
  { incomeRange: "₹5,00,001 to ₹10,00,000", taxRate: "20%" },
  { incomeRange: "Above ₹10,00,000", taxRate: "30%" },
];

const newRegimeSlabs: TaxSlab[] = [
  {
    incomeRange: "Up to ₹3,00,000",
    taxRate: "Nil",
    description: "Basic exemption limit",
  },
  { incomeRange: "₹3,00,001 to ₹6,00,000", taxRate: "5%" },
  { incomeRange: "₹6,00,001 to ₹9,00,000", taxRate: "10%" },
  { incomeRange: "₹9,00,001 to ₹12,00,000", taxRate: "15%" },
  { incomeRange: "₹12,00,001 to ₹15,00,000", taxRate: "20%" },
  { incomeRange: "Above ₹15,00,000", taxRate: "30%" },
];

// Function to render tax slabs with NO whitespace in JSX
function renderSlabsTable(slabs: TaxSlab[], regime: string) {
  return (
    <div className="p-6 pt-0">
      <Table aria-label={`${regime} Tax Regime Slabs for FY 2024-25`}>
        <TableCaption>
          Income Tax Slabs for {regime} Tax Regime (FY 2024-25)
        </TableCaption>
        <TableHeader>
          <TableRow>
            {/* No whitespace between tags */}
            <TableHead>Income Range</TableHead>
            <TableHead>Tax Rate</TableHead>
            <TableHead className="hidden md:table-cell">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* No whitespace between tags */}
          {slabs.map((slab, index) => (
            <TableRow key={index}>
              {/* No whitespace between tags */}
              <TableCell className="font-medium">{slab.incomeRange}</TableCell>
              <TableCell>{slab.taxRate}</TableCell>
              <TableCell className="hidden md:table-cell">
                {slab.description || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TaxSlabsContent() {
  const [activeTab, setActiveTab] = useState("old-regime");

  return (
    <div className="container mx-auto space-y-8 p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-3">
        <Calculator className="size-8" />
        Income Tax Slabs (FY 2024-25)
      </h1>
      <p className="text-muted-foreground text-lg">
        Compare the tax slabs between Old and New tax regimes for Financial Year
        2024-25 (Assessment Year 2025-26).
      </p>

      <Tabs
        defaultValue="old-regime"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="old-regime">Old Tax Regime</TabsTrigger>
          <TabsTrigger value="new-regime">New Tax Regime</TabsTrigger>
        </TabsList>
        <TabsContent value="old-regime" className="mt-2">
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle>Old Tax Regime</CardTitle>
              <CardDescription>
                Allows for various deductions and exemptions under Chapter VI-A
              </CardDescription>
            </CardHeader>
            {renderSlabsTable(oldRegimeSlabs, "Old")}
          </Card>
        </TabsContent>
        <TabsContent value="new-regime" className="mt-2">
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle>New Tax Regime</CardTitle>
              <CardDescription>
                Default regime with lower rates but limited deductions
              </CardDescription>
            </CardHeader>
            {renderSlabsTable(newRegimeSlabs, "New")}
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8 bg-secondary border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Surcharge:</strong> Applicable on income above ₹50 lakhs
            (10%) and ₹1 crore (15%) under both regimes.
          </p>
          <p>
            <strong>Health & Education Cess:</strong> 4% of income tax plus
            surcharge under both regimes.
          </p>
          <p>
            <strong>Rebate u/s 87A:</strong> Tax rebate of up to ₹25,000 for
            residents with total income up to ₹7 lakhs under the new regime and
            ₹5 lakhs under the old regime.
          </p>
          <p>
            <strong>Standard Deduction:</strong> ₹50,000 for salaried employees
            under both regimes from FY 2023-24 onwards.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface TaxSlabsPageProps {
  params: Record<string, string | string[] | undefined>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function TaxSlabsPage({
  params,
  searchParams,
}: TaxSlabsPageProps) {
  return <TaxSlabsContent />;
}
