// src/lib/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Supabase URL is missing. Please set NEXT_PUBLIC_SUPABASE_URL in your environment variables."
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    "Supabase anonymous key is missing. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables."
  );
}

// Validate URL format before creating the client
let validatedSupabaseUrl: URL;
try {
  validatedSupabaseUrl = new URL(supabaseUrl);
  // Basic check for Supabase URL structure (allow .co and .in TLDs)
  if (!/\.supabase\.(co|in)$/.test(validatedSupabaseUrl.hostname)) {
    console.warn(
      `Suspicious Supabase URL format: ${supabaseUrl}. Ensure it is correct (e.g., https://<project-id>.supabase.co).`
    );
  }
  // Ensure it starts with https://
  if (validatedSupabaseUrl.protocol !== "https:") {
    throw new Error("Supabase URL must start with 'https://'.");
  }
} catch (e: any) {
  // Catch specific URL parsing errors and provide a clearer message
  console.error(
    "Invalid Supabase URL provided in NEXT_PUBLIC_SUPABASE_URL:",
    supabaseUrl
  );
  throw new Error(
    `Invalid Supabase URL format in environment variables. Ensure it starts with 'https://' and is a valid URL (e.g., https://<project-id>.supabase.co). Received: "${supabaseUrl}". Original error: ${e.message}`
  );
}

// Create a single supabase client for interacting with your database
// Use validatedSupabaseUrl.toString() to ensure it's a string
export const supabase: SupabaseClient = createClient(
  validatedSupabaseUrl.toString(),
  supabaseAnonKey
);
