import React from "react"; // Add React import
// Remove Poppins font import from next/font/google
// import { Poppins } from 'next/font/google';
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import MainLayout from "@/components/MainLayout"; // Import the new layout component
import type { Metadata } from "next";

// SEO Optimization: Define metadataBase for resolving relative Open Graph image paths
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:9002";

// Remove Poppins font configuration
// const poppins = Poppins({
//   subsets: ['latin'],
//   weight: ['400', '600', '700'], // Include necessary weights
//   variable: '--font-poppins', // Define CSS variable name
// });

export const metadata: Metadata = {
  // Re-add Metadata type
  metadataBase: new URL(siteUrl), // Add metadataBase
  title: {
    // More descriptive title structure
    default: "TaxSage AI - Smart Tax Planning & Savings",
    template: "%s | TaxSage AI",
  },
  description:
    "Get personalized AI-driven tax saving strategies, compare tax regimes (New vs Old FY 2024-25), calculate deductions (80C, 80D, HRA), and generate tax reports.",
  keywords: [
    "tax saving",
    "income tax",
    "india tax",
    "tax planning",
    "AI tax advisor",
    "80C",
    "80D",
    "HRA",
    "tax calculator",
    "new tax regime",
    "old tax regime",
    "fy 2024-25",
  ], // Added keywords
  openGraph: {
    // Added Open Graph metadata
    title: "TaxSage AI - Smart Tax Planning & Savings",
    description:
      "Personalized AI tax suggestions, calculators, and reports for India (FY 2024-25).",
    url: siteUrl,
    siteName: "TaxSage AI",
    // images: [ // Optional: Add a default Open Graph image
    //   {
    //     url: '/og-image.png', // Place an image in the public folder
    //     width: 1200,
    //     height: 630,
    //     alt: 'TaxSage AI Banner',
    //   },
    // ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    // Added Twitter card metadata
    card: "summary_large_image",
    title: "TaxSage AI - Smart Tax Planning & Savings",
    description:
      "AI-powered tax planning for India. Get suggestions, calculate deductions, compare regimes.",
    // images: ['/twitter-image.png'], // Optional: Add a Twitter-specific image
    // creator: '@yourtwitterhandle', // Optional: Add Twitter handle
  },
  robots: {
    // Define indexing rules
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Optional: Add icons and manifest if desired
  // icons: {
  //   icon: '/favicon.ico',
  //   apple: '/apple-touch-icon.png',
  // },
  // manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add Google Font link tags */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          href="/icon.png"
          type="image/<generated>"
          sizes="<generated>"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-icon.png"
          type="image/<generated>"
          sizes="<generated>"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn("min-h-screen antialiased bg-background font-sans")}>
        <AuthProvider>
          {" "}
          {/* AuthProvider wraps MainLayout */}
          <MainLayout>
            {" "}
            {/* Use MainLayout to render structure */}
            {children} {/* Page content goes here */}
          </MainLayout>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
