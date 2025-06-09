// src/ai/flows/tax-saving-suggestions.ts
"use server";

/**
 * @fileOverview AI-powered personalized tax saving strategy suggestions based on user data using Google Generative AI.
 *
 * - getTaxSavingSuggestions - A function that provides tax saving suggestions, comparisons, and estimated tax.
 * - TaxSavingSuggestionsInput - The input type for the getTaxSavingSuggestions function.
 * - TaxSavingSuggestionsOutput - The return type for the getTaxSavingSuggestions function.
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { z } from "zod";
import { calculateTaxPayable } from "@/lib/taxUtils"; // Import the tax calculation utility

// --- Input and Output Schemas ---
const TaxSavingSuggestionsInputSchema = z.object({
  income: z.number().describe("Annual gross income of the user."),
  deductions: z
    .string()
    .describe(
      "List of deductions available OR claimed by the user (e.g., 80C: 150000, 80D: 25000, HRA: 50000). Provide amounts if known for better accuracy, otherwise just list sections."
    ),
  investments: z
    .string()
    .describe("List of investments made by the user, separated by commas."),
});
export type TaxSavingSuggestionsInput = z.infer<
  typeof TaxSavingSuggestionsInputSchema
>;

// Updated Output Schema
const TaxSavingSuggestionsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      "Personalized tax saving strategy suggestions based on user inputs."
    ),
  taxRegimeComparison: z
    .string()
    .describe("Comparison of old and new tax regimes for FY 2024-25."),
  commonMistakes: z
    .string()
    .describe("Common tax-related mistakes and warnings for the user."),
  // Add estimated tax fields
  estimatedTaxOldRegime: z
    .number()
    .optional()
    .describe("Estimated tax payable under the Old Regime for FY 2024-25."),
  estimatedTaxNewRegime: z
    .number()
    .optional()
    .describe("Estimated tax payable under the New Regime for FY 2024-25."),
});
export type TaxSavingSuggestionsOutput = z.infer<
  typeof TaxSavingSuggestionsOutputSchema
>;

// --- Google Generative AI Setup ---
const API_KEY = process.env.GOOGLE_GENAI_API_KEY;

if (!API_KEY) {
  throw new Error("GOOGLE_GENAI_API_KEY environment variable is not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

// Helper to parse deduction string and estimate total deductions
// This is a simple parser, needs improvement for accuracy
function estimateTotalDeductions(deductionString: string): number {
  let total = 0;
  const deductions = deductionString.split(",").map((d) => d.trim());
  const standardDeduction = 50000; // Assuming applicable for old regime salary

  deductions.forEach((d) => {
    const parts = d.split(":").map((p) => p.trim());
    if (parts.length === 2) {
      // Format like "80C: 150000"
      const amount = parseFloat(parts[1].replace(/[^0-9.]/g, ""));
      if (!isNaN(amount)) {
        // Basic capping for known sections (can be expanded)
        if (parts[0].toUpperCase() === "80C") total += Math.min(amount, 150000);
        else if (parts[0].toUpperCase() === "80D")
          total += Math.min(amount, 75000); // Simple cap, needs age context
        else if (
          parts[0].toUpperCase() === "NPS" ||
          parts[0].toUpperCase().includes("80CCD(1B)")
        )
          total += Math.min(amount, 50000);
        else total += amount; // Add other amounts directly
      }
    } else if (d.toLowerCase().includes("80c")) {
      total += 150000; // Assume max if amount not specified
    } else if (d.toLowerCase().includes("80d")) {
      total += 25000; // Assume basic minimum if amount not specified
    } else if (d.toLowerCase().includes("hra")) {
      // HRA needs calculation based on salary, rent etc. Cannot estimate from string alone.
      // We might ask the AI to consider HRA possibility instead.
    } else if (
      d.toLowerCase().includes("nps") ||
      d.toLowerCase().includes("80ccd(1b)")
    ) {
      total += 50000; // Assume max additional NPS
    }
    // Check if Standard Deduction is explicitly mentioned or implied (e.g., salary income)
    if (d.toLowerCase().includes("standard deduction")) {
      // Already accounted for below if not explicitly 0
    }
  });

  // Add Standard Deduction (assuming salaried for old regime) if not already covered
  // This logic might need refinement depending on input details
  if (!deductions.some((d) => d.toLowerCase().includes("standard deduction"))) {
    total += standardDeduction;
  }

  return total;
}

// --- Main Function ---
export async function getTaxSavingSuggestions(
  input: TaxSavingSuggestionsInput
): Promise<TaxSavingSuggestionsOutput> {
  const validatedInput = TaxSavingSuggestionsInputSchema.parse(input);

  // Calculate estimated taxes using the utility
  const estimatedDeductionsOld = estimateTotalDeductions(
    validatedInput.deductions
  );
  const taxOld = calculateTaxPayable(
    validatedInput.income,
    estimatedDeductionsOld,
    "old"
  );
  const taxNew = calculateTaxPayable(validatedInput.income, 0, "new"); // Deductions generally not applicable in New Regime

  const prompt = `
    You are a helpful tax advisor AI specializing in Indian tax regulations for the Financial Year 2024-25 (Assessment Year 2025-26).
    Your goal is to provide personalized tax-saving suggestions, comparisons, and common mistake warnings based on the user's financial information.

    User Information:
    - Annual Gross Income: INR ${validatedInput.income.toLocaleString("en-IN")}
    - Available/Claimed Deductions: ${
      validatedInput.deductions || "None provided"
    }
    - Investments Made: ${validatedInput.investments || "None provided"}
    - Pre-calculated Estimated Tax (FY 2024-25):
        - Old Regime: INR ${taxOld.totalTax.toLocaleString(
          "en-IN"
        )} (based on estimated deductions of INR ${estimatedDeductionsOld.toLocaleString(
    "en-IN"
  )})
        - New Regime (Default): INR ${taxNew.totalTax.toLocaleString("en-IN")}

    Please provide the following in JSON format, matching the schema described below:
    1.  **suggestions**: Personalized, actionable tax-saving strategy suggestions. Consider maximizing deductions under the Old Regime and evaluating the New Regime. Mention specific sections like 80C, 80D, HRA (mention it needs calculation), NPS (80CCD(1B)), home loan interest (Section 24b), etc., if relevant based on the inputs. Be concise and clear.
    2.  **taxRegimeComparison**: A brief comparison highlighting the key differences and potential benefits/drawbacks of the Old vs. New Tax Regime for this user, considering the pre-calculated tax amounts. Mention the default nature of the New Regime. Include the estimated tax difference.
    3.  **commonMistakes**: List 2-3 common tax-related mistakes relevant to the user's situation (e.g., not declaring income, incorrect HRA calculation, missing investment proofs) and provide brief warnings.

    Output JSON Schema:
    {
      "type": "object",
      "properties": {
        "suggestions": {
          "type": "string",
          "description": "Personalized tax saving strategy suggestions based on user inputs."
        },
        "taxRegimeComparison": {
          "type": "string",
          "description": "Comparison of old and new tax regimes for FY 2024-25, including estimated tax difference."
        },
        "commonMistakes": {
          "type": "string",
          "description": "Common tax-related mistakes and warnings for the user."
        }
      },
      "required": ["suggestions", "taxRegimeComparison", "commonMistakes"]
    }

    Ensure the output is valid JSON. Do not include any introductory text or explanation outside the JSON structure. Base your comparison on the provided estimated tax figures.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text();

    let parsedOutput: any;
    try {
      parsedOutput = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse JSON response from AI:", jsonText);
      throw new Error("AI returned invalid JSON format.");
    }

    // Validate AI text output against the base schema (without tax estimates yet)
    const BaseOutputSchema = TaxSavingSuggestionsOutputSchema.omit({
      estimatedTaxOldRegime: true,
      estimatedTaxNewRegime: true,
    });
    const validatedTextOutput = BaseOutputSchema.parse(parsedOutput);

    // Combine validated text output with pre-calculated tax estimates
    const finalOutput: TaxSavingSuggestionsOutput = {
      ...validatedTextOutput,
      estimatedTaxOldRegime: taxOld.totalTax,
      estimatedTaxNewRegime: taxNew.totalTax,
    };

    // Final validation including tax estimates
    return TaxSavingSuggestionsOutputSchema.parse(finalOutput);
  } catch (error: any) {
    console.error("Error generating tax suggestions:", error);
    if (error.message.includes("SAFETY")) {
      throw new Error(
        "Request blocked due to safety concerns. Please modify your input."
      );
    }
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.errors);
      throw new Error(
        `AI response validation failed: ${error.errors
          .map((e) => e.message)
          .join(", ")}`
      );
    }
    throw new Error("Failed to get tax suggestions from AI.");
  }
}
