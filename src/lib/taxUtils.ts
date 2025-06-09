// src/lib/taxUtils.ts
// Removed 'use server' directive as this file contains synchronous utility functions.

// Define types for tax slabs
type Slab = {
  rangeMin: number;
  rangeMax: number;
  rate: number;
};

type TaxRegimeData = {
  slabs: Slab[];
  basicExemption: number;
  rebateLimit?: number; // Income limit for rebate u/s 87A
  rebateAmount?: number; // Max rebate amount u/s 87A
  standardDeduction?: number; // Applicable standard deduction
};

type FiscalYearTaxData = {
  newRegime: TaxRegimeData;
  oldRegime: TaxRegimeData; // Assuming standard old regime (below 60 years)
  // Add variants for senior/super senior citizens if needed
};

// Surcharge rates for FY 2024-25 (AY 2025-26)
// Format: { incomeLimit, rate, capForSpecialIncome, capForNewRegime }
const surchargeRatesFY2024_25 = [
  { incomeLimit: 5000000, rate: 0, capForSpecialIncome: 0, capForNewRegime: 0 }, // Up to 50 Lakh
  {
    incomeLimit: 10000000,
    rate: 0.1,
    capForSpecialIncome: 0.1,
    capForNewRegime: 0.1,
  }, // 50 Lakh to 1 Crore
  {
    incomeLimit: 20000000,
    rate: 0.15,
    capForSpecialIncome: 0.15,
    capForNewRegime: 0.15,
  }, // 1 Crore to 2 Crore
  {
    incomeLimit: 50000000,
    rate: 0.25,
    capForSpecialIncome: 0.15,
    capForNewRegime: 0.25,
  }, // 2 Crore to 5 Crore
  {
    incomeLimit: Infinity,
    rate: 0.37,
    capForSpecialIncome: 0.15,
    capForNewRegime: 0.25,
  }, // Above 5 Crore
];

// Health and Education Cess Rate
const CESS_RATE = 0.04;

// Tax Data for FY 2024-25 (AY 2025-26)
const taxDataFY2024_25: FiscalYearTaxData = {
  newRegime: {
    slabs: [
      { rangeMin: 0, rangeMax: 300000, rate: 0 },
      { rangeMin: 300001, rangeMax: 600000, rate: 0.05 },
      { rangeMin: 600001, rangeMax: 900000, rate: 0.1 },
      { rangeMin: 900001, rangeMax: 1200000, rate: 0.15 },
      { rangeMin: 1200001, rangeMax: 1500000, rate: 0.2 },
      { rangeMin: 1500001, rangeMax: Infinity, rate: 0.3 },
    ],
    basicExemption: 300000,
    rebateLimit: 700000,
    rebateAmount: 25000, // Max rebate is effectively tax on 7L income
    standardDeduction: 50000,
  },
  oldRegime: {
    // Standard Old Regime (Below 60 years)
    slabs: [
      { rangeMin: 0, rangeMax: 250000, rate: 0 },
      { rangeMin: 250001, rangeMax: 500000, rate: 0.05 },
      { rangeMin: 500001, rangeMax: 1000000, rate: 0.2 },
      { rangeMin: 1000001, rangeMax: Infinity, rate: 0.3 },
    ],
    basicExemption: 250000,
    rebateLimit: 500000,
    rebateAmount: 12500,
    standardDeduction: 50000, // Also applicable for Old Regime if salary income
  },
  // TODO: Add variants for senior (60-80) and super senior (80+) for Old Regime if needed
};

// --- Helper Functions ---

/**
 * Calculates income tax based on slabs for a given taxable income.
 */
function calculateSlabTax(taxableIncome: number, slabs: Slab[]): number {
  let tax = 0;
  let incomeProcessed = 0;

  for (const slab of slabs) {
    const slabMin = slab.rangeMin === 0 ? 0 : slab.rangeMin - 1; // Adjust for inclusive lower bound
    const slabMax = slab.rangeMax;

    if (taxableIncome <= slabMin) {
      break;
    }

    const incomeInSlab =
      Math.min(taxableIncome, slabMax) - Math.max(incomeProcessed, slabMin);

    if (incomeInSlab > 0) {
      tax += incomeInSlab * slab.rate;
    }

    incomeProcessed = slabMax;
    if (taxableIncome <= slabMax) {
      break;
    }
  }
  return Math.max(0, tax);
}

/**
 * Calculates surcharge based on total income and tax regime.
 * NOTE: Assumes tax is calculated on the total income, not splitting special income types yet.
 */
function calculateSurcharge(
  totalIncome: number,
  taxBeforeSurcharge: number,
  regime: "new" | "old"
): number {
  if (taxBeforeSurcharge <= 0) return 0;

  let applicableRate = 0;
  const rates = surchargeRatesFY2024_25; // Using FY 2024-25 rates

  for (const rateInfo of rates) {
    if (totalIncome <= rateInfo.incomeLimit) {
      applicableRate = rateInfo.rate;
      // Apply caps based on regime
      if (regime === "new") {
        applicableRate = Math.min(applicableRate, rateInfo.capForNewRegime);
      }
      // Simplified: Cap for special incomes not strictly applied here as we don't isolate tax components yet
      // applicableRate = Math.min(applicableRate, rateInfo.capForSpecialIncome); // Use if tax on special income is isolated
      break;
    }
    // Handle the highest bracket explicitly if the loop finishes
    if (rateInfo.incomeLimit === Infinity) {
      applicableRate = rateInfo.rate;
      if (regime === "new") {
        applicableRate = Math.min(applicableRate, rateInfo.capForNewRegime);
      }
      // applicableRate = Math.min(applicableRate, rateInfo.capForSpecialIncome); // If needed
    }
  }

  let surcharge = taxBeforeSurcharge * applicableRate;

  // --- Marginal Relief Calculation (Simplified) ---
  // Marginal relief applies if tax+surcharge > (tax on threshold income + (total income - threshold income))
  for (const rateInfo of rates) {
    const threshold = rateInfo.incomeLimit;
    if (threshold === 0 || threshold === Infinity) continue; // Skip 0 and Infinity limits

    if (totalIncome > threshold && totalIncome <= threshold * 1.05) {
      // Check slightly above threshold
      // Recalculate tax just on the threshold income
      // Need to ensure this doesn't cause infinite loops if called from calculateTaxPayableInternal
      const taxOnThreshold = calculateTaxPayableInternal(
        threshold,
        0,
        regime,
        taxDataFY2024_25
      ).taxBeforeCess; // Assuming 0 deductions for simplicity here
      const taxIncrease = taxBeforeSurcharge + surcharge - taxOnThreshold;
      const incomeIncrease = totalIncome - threshold;

      if (taxIncrease > incomeIncrease) {
        const relief = taxIncrease - incomeIncrease;
        surcharge = Math.max(0, surcharge - relief);
        // console.log(`Marginal relief applied at ${threshold}: ${relief.toFixed(2)}`);
        break; // Apply relief based on the first applicable threshold
      }
    }
  }

  return Math.max(0, surcharge);
}

/**
 * Internal function to calculate tax payable, avoiding direct recursion issues for marginal relief.
 */
function calculateTaxPayableInternal(
  grossIncome: number,
  totalDeductions: number, // Only relevant for Old Regime usually
  regime: "new" | "old",
  taxData: FiscalYearTaxData
): {
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  taxBeforeCess: number;
} {
  const regimeData = regime === "new" ? taxData.newRegime : taxData.oldRegime;

  // 1. Apply Standard Deduction (if applicable)
  let incomeAfterStdDed = grossIncome;
  // Assuming Standard Deduction is applicable if gross income is positive (implies some form of income like salary/pension)
  // In a real scenario, you'd need better flags for income type.
  if (regimeData.standardDeduction && grossIncome > 0) {
    incomeAfterStdDed = Math.max(0, grossIncome - regimeData.standardDeduction);
  }

  // 2. Calculate Taxable Income
  let taxableIncome = incomeAfterStdDed;
  if (regime === "old") {
    taxableIncome = Math.max(0, incomeAfterStdDed - totalDeductions);
  }
  taxableIncome = Math.max(0, taxableIncome); // Ensure non-negative

  // 3. Calculate Tax based on Slabs
  const taxBeforeRebate = calculateSlabTax(taxableIncome, regimeData.slabs);

  // 4. Calculate Rebate u/s 87A
  let rebate = 0;
  if (
    regimeData.rebateLimit &&
    taxableIncome <= regimeData.rebateLimit &&
    regimeData.rebateAmount
  ) {
    rebate = Math.min(taxBeforeRebate, regimeData.rebateAmount);
  }
  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);

  // 5. Calculate Surcharge
  // Surcharge calculation uses *Total Income* (gross income - deductions) for rate determination, but applies to *tax payable*.
  // Let's refine this: Calculate total income based on regime rules.
  let incomeForSurchargeRate = grossIncome;
  // If old regime, consider deductions (excluding standard deduction which is applied later or implicitly in slab rates for New Regime)
  // If new regime, standard deduction is allowed now, so use income after std ded.
  if (regime === "old") {
    // Recalculate income for surcharge base: Gross - Chapter VI-A deductions
    // Standard deduction is handled differently - often considered part of salary computation before GTI.
    // Let's use `taxableIncome + totalDeductions` (excluding std ded if it was part of totalDeductions) as approximation for GTI
    // Or simpler: Use taxableIncome before deductions for old regime rate check? Tax rules are complex!
    // Sticking to grossIncome for rate determination for simplicity, but acknowledging this limitation.
  } else {
    // New Regime: Use income after standard deduction
    incomeForSurchargeRate = incomeAfterStdDed;
  }

  const surcharge = calculateSurcharge(
    incomeForSurchargeRate,
    taxAfterRebate,
    regime
  ); // Pass correct income base

  // 6. Calculate Health and Education Cess
  const taxBeforeCess = taxAfterRebate + surcharge;
  const cess = taxBeforeCess * CESS_RATE;

  // 7. Calculate Total Tax Payable
  const totalTax = taxBeforeCess + cess;

  return {
    taxableIncome,
    taxBeforeRebate,
    rebate,
    taxAfterRebate,
    surcharge,
    cess,
    totalTax: Math.round(totalTax), // Round final tax
    taxBeforeCess,
  };
}

/**
 * Calculates the total payable tax for a given income, deductions, and regime.
 * FY 2024-25 (AY 2025-26)
 */
export function calculateTaxPayable(
  grossIncome: number,
  totalDeductions: number = 0, // Deductions primarily for Old Regime
  regime: "new" | "old"
): {
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate: number;
  taxAfterRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  taxBeforeCess: number;
} {
  // Call the internal function which contains the main logic
  return calculateTaxPayableInternal(
    grossIncome,
    totalDeductions,
    regime,
    taxDataFY2024_25
  );
}

// --- Exports ---
export const FY2024_25_NewRegimeSlabs = taxDataFY2024_25.newRegime.slabs;
export const FY2024_25_OldRegimeSlabs = taxDataFY2024_25.oldRegime.slabs;
export const FY2024_25_SurchargeRates = surchargeRatesFY2024_25;
export const FY2024_25_CessRate = CESS_RATE;

// You might add functions here to parse deduction strings, calculate specific deductions (80C, HRA etc.) if needed elsewhere
// Example:
// export function parseDeductions(deductionString: string): number { ... }
