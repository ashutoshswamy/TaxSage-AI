// src/components/MainLayout.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Home,
  FileText,
  Lightbulb,
  Landmark,
  Coins,
  ReceiptText,
  DollarSign,
  Loader2,
  History,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { cn } from "@/lib/utils"; // Import cn
import Footer from "./Footer"; // Import the Footer component
import { SheetHeader, SheetTitle } from "./ui/sheet"; // Import SheetHeader and SheetTitle
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, logout } = useAuth(); // Get logout from useAuth
  const isMobile = useIsMobile();

  // Global loading state handled by AuthProvider, but show loader here too for initial check
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    // --- Logged-in Layout with Sidebar ---
    // Sidebar is always expanded on desktop (collapsible="none"), offcanvas on mobile
    return (
      <SidebarProvider
        defaultOpen={!isMobile} // Open by default on desktop, closed on mobile
        collapsible={isMobile ? "offcanvas" : "none"} // Offcanvas for mobile, none for desktop
      >
        <div className="flex min-h-screen">
          {" "}
          {/* Wrapper to hold sidebar and main content */}
          <Sidebar side="left" variant="sidebar">
            {" "}
            {/* Explicitly set side and variant if needed */}
            <SidebarHeader className="flex items-center justify-between p-2 border-b border-sidebar-border">
              {" "}
              {/* Added border */}
              <Link href="/" className="flex items-center gap-2">
                {" "}
                {/* Make logo a link */}
                <Landmark className="size-6 text-primary" />
                <span className="font-semibold text-lg text-sidebar-foreground">
                  TaxSage AI
                </span>
              </Link>
              {/* Hide desktop trigger when sidebar is always visible */}
              {/* {isMobile && <SidebarTrigger />} */}
              <SidebarTrigger className={cn(isMobile ? "" : "hidden")} />
            </SidebarHeader>
            <SidebarContent className="flex-1 overflow-y-auto">
              {" "}
              {/* Ensure content can scroll and fills space */}
              <SidebarMenu className="flex flex-col h-full p-2">
                {" "}
                {/* Make menu full height and add padding */}
                {/* Ensure consistent icon usage */}
                <SidebarMenuItem>
                  <Link href="/">
                    <SidebarMenuButton tooltip="Dashboard">
                      <Home />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/ai-suggestions">
                    <SidebarMenuButton tooltip="AI Suggestions">
                      <Lightbulb />
                      <span>AI Suggestions</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/report">
                    <SidebarMenuButton tooltip="Generate New Report">
                      <FileText />
                      <span>Generate Report</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/report-history">
                    <SidebarMenuButton tooltip="Report History">
                      <History />
                      <span>Report History</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/deductions">
                    <SidebarMenuButton tooltip="Deductions Guide">
                      <ReceiptText />
                      <span>Deductions Guide</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/tax-slabs">
                    <SidebarMenuButton tooltip="Tax Slabs">
                      <Coins />
                      <span>Tax Slabs</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/surcharge">
                    <SidebarMenuButton tooltip="STC/Surcharge">
                      <DollarSign />
                      <span>STC/Surcharge</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                {/* Logout Button moved to the end of the menu, pushed down */}
                <SidebarMenuItem className="mt-auto pt-2">
                  {" "}
                  {/* Push to bottom with padding */}
                  <SidebarMenuButton
                    tooltip="Logout"
                    onClick={logout}
                    className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <LogOut />
                    <span>Log out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            {/* SidebarFooter removed */}
          </Sidebar>
          {/* Main Content Area with Footer */}
          <div
            className={cn(
              "flex flex-col flex-1 overflow-auto",
              isMobile ? "" : "ml-[var(--sidebar-width)]" // Adjust margin for desktop
            )}
          >
            {/* Top bar for mobile only (since sidebar is offcanvas) */}
            {isMobile && (
              <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <SidebarTrigger />
                  </SheetTrigger>
                  <SheetHeader className="sr-only">
                    <SheetTitle>Main Navigation</SheetTitle>
                  </SheetHeader>
                </Sheet>
                <Link href="/" className="flex items-center gap-2">
                  <Landmark className="size-6 text-primary" />
                  <span className="font-semibold text-lg">TaxSage AI</span>
                </Link>
                <AuthButton />
              </header>
            )}
            {/* Page Content - Remove padding here, let child pages manage with .container */}
            <main className="flex-1">{children}</main>
            <Footer /> {/* Add Footer here */}
          </div>
        </div>
      </SidebarProvider>
    );
  } else {
    // --- Public Layout (No Sidebar) ---
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 md:px-6 lg:px-8">
          {" "}
          {/* Responsive padding */}
          <Link href="/" className="flex items-center gap-2">
            <Landmark className="size-6 text-primary" />
            <span className="font-semibold text-lg">TaxSage AI</span>
          </Link>
          <div className="flex items-center gap-4">
            {/* Public Nav Links - Deductions and Tax Slabs removed */}
            <nav className="hidden md:flex gap-4">
              {/* Add other public links as needed */}
            </nav>
            <AuthButton />
          </div>
        </header>
        {/* Ensure main content takes up available space, footer pushed down */}
        {/* Remove padding here */}
        <main className="flex-1">{children}</main>
        <Footer /> {/* Add Footer here */}
      </div>
    );
  }
}
