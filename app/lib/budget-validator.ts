export type BudgetItem = {
  category: string;
  amount: number;
  details: string;
};

export type BudgetStatus = "balanced" | "under_allocated" | "over_allocated" | "invalid";

export type BudgetValidationResult = {
  allocated: number;
  requested: number;
  difference: number;
  matches: boolean;
  valid: boolean;
  status: BudgetStatus;
  errors: string[];
  warnings: string[];
  disclaimer: string;
};

export type BudgetParseResult = {
  amount: number | null;
  rawMatched: string | null;
  isReliable: boolean;
  needsClarification: boolean;
  message?: string;
};

/**
 * Validates the arithmetic allocation of an event budget against the requested total.
 * Explicitly differentiates mathematical consistency from external vendor price verification.
 */
export function validateBudget(
  budget: BudgetItem[],
  requestedBudget: number
): BudgetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(budget) || budget.length === 0) {
    errors.push("Budget breakdown is empty. At least one line item is required.");
  }

  if (typeof requestedBudget !== "number" || !Number.isFinite(requestedBudget) || requestedBudget < 0) {
    errors.push("Requested budget must be a valid, finite non-negative number.");
  }

  let totalAllocated = 0;

  if (Array.isArray(budget)) {
    budget.forEach((item, index) => {
      const rowLabel = item?.category?.trim() ? `Category "${item.category.trim()}"` : `Item #${index + 1}`;

      if (!item || typeof item !== "object") {
        errors.push(`${rowLabel} is not a valid budget entry.`);
        return;
      }

      if (!item.category || typeof item.category !== "string" || !item.category.trim()) {
        errors.push(`Budget line item #${index + 1} is missing a descriptive category name.`);
      }

      if (typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount < 0) {
        errors.push(`${rowLabel} has an invalid or negative amount (${item?.amount}).`);
      } else {
        totalAllocated += item.amount;
      }
    });
  }

  // Round to 2 decimal places to eliminate JavaScript floating point rounding anomalies
  const allocated = Math.round(totalAllocated * 100) / 100;
  const requested = Number.isFinite(requestedBudget) && requestedBudget >= 0
    ? Math.round(requestedBudget * 100) / 100
    : 0;

  const difference = Math.round((requested - allocated) * 100) / 100;
  const matches = Math.abs(difference) < 0.01;

  let status: BudgetStatus = "balanced";

  if (errors.length > 0) {
    status = "invalid";
  } else if (matches) {
    status = "balanced";
  } else if (difference > 0) {
    status = "under_allocated";
    warnings.push(
      `₹${difference.toLocaleString("en-IN")} remains unallocated. You can assign this to buffer, contingency, or prizes.`
    );
  } else {
    status = "over_allocated";
    errors.push(
      `Budget exceeds requested limit by ₹${Math.abs(difference).toLocaleString("en-IN")}. Total allocated is ₹${allocated.toLocaleString("en-IN")}.`
    );
  }

  return {
    allocated,
    requested,
    difference,
    matches,
    valid: errors.length === 0 && matches,
    status,
    errors,
    warnings,
    disclaimer: "Arithmetic validation only. Does not verify external vendor quotations or live market prices.",
  };
}

/**
 * Parses requested Indian Rupee (INR) budgets from freeform user briefs.
 * Handles formats like: ₹50,000, INR 50000, 50k, 5 lakh, 1.5 lakhs, Rs. 1,20,000.
 * If ambiguous or absent, reports needsClarification: true so the user can be asked rather than guessing.
 */
export function extractRequestedBudget(brief: string): BudgetParseResult {
  if (!brief || typeof brief !== "string" || !brief.trim()) {
    return {
      amount: null,
      rawMatched: null,
      isReliable: false,
      needsClarification: true,
      message: "No event brief provided. Please provide an event brief with a target budget.",
    };
  }

  const clean = brief.trim();

  // Pattern 1: Budget keyword with explicit number and unit
  // e.g. "budget of ₹50,000", "budget: 5 lakh", "budget 50k", "total budget of 1,20,000 INR"
  const budgetPrefixPattern =
    /(?:budget(?:\s+(?:of|is|up\s+to|limit|cap))?|total\s+budget|target\s+budget|within|cap\s+of)\s*[:=-]?\s*(?:(?:rs\.?|inr|₹)\s*)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(lakhs?|lacs?|k|cr|crores?|thousand)?(?:\s*(?:rs\.?|inr|₹|rupees))?/i;

  const prefixMatch = clean.match(budgetPrefixPattern);
  if (prefixMatch) {
    const parsed = parseValueAndUnit(prefixMatch[1], prefixMatch[2]);
    if (parsed !== null && parsed > 0) {
      return {
        amount: parsed,
        rawMatched: prefixMatch[0].trim(),
        isReliable: true,
        needsClarification: false,
      };
    }
  }

  // Pattern 2: Unit-suffixed amount before budget keyword
  // e.g. "50k budget", "5 lakh budget", "₹1.5L budget", "10k prize pool"
  const suffixPattern =
    /(?:(?:rs\.?|inr|₹)\s*)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(lakhs?|lacs?|k|cr|crores?|thousand)?\s*(?:rs\.?|inr|₹|rupees)?\s+(?:budget|prize\s+pool|total\s+allocation)/i;

  const suffixMatch = clean.match(suffixPattern);
  if (suffixMatch) {
    const parsed = parseValueAndUnit(suffixMatch[1], suffixMatch[2]);
    if (parsed !== null && parsed > 0) {
      return {
        amount: parsed,
        rawMatched: suffixMatch[0].trim(),
        isReliable: true,
        needsClarification: false,
      };
    }
  }

  // Pattern 3: Explicit currency symbol or INR/Rs with amount
  // e.g. "₹50,000", "INR 1,20,000", "Rs. 75,000", "50,000 rupees", "₹ 5 lakhs"
  const currencyPattern =
    /(?:(?:₹|rs\.?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(lakhs?|lacs?|k|cr|crores?|thousand)?|(\d+(?:,\d+)*(?:\.\d+)?)\s*(lakhs?|lacs?|k|cr|crores?|thousand)?\s*(?:inr|rs\.?|rupees))/i;

  const currencyMatch = clean.match(currencyPattern);
  if (currencyMatch) {
    const numPart = currencyMatch[1] || currencyMatch[3];
    const unitPart = currencyMatch[2] || currencyMatch[4];
    const parsed = parseValueAndUnit(numPart, unitPart);
    if (parsed !== null && parsed > 0) {
      return {
        amount: parsed,
        rawMatched: currencyMatch[0].trim(),
        isReliable: true,
        needsClarification: false,
      };
    }
  }

  // No unambiguous budget format found
  return {
    amount: null,
    rawMatched: null,
    isReliable: false,
    needsClarification: true,
    message: "No explicit budget found in brief. Please specify your target budget (e.g. ₹50,000, 5 lakh, 50k).",
  };
}

/**
 * Helper to convert number string and magnitude unit to numerical value.
 */
function parseValueAndUnit(numStr: string, unitStr?: string): number | null {
  if (!numStr) return null;
  const num = Number(numStr.replace(/,/g, ""));
  if (!Number.isFinite(num) || num < 0) return null;

  const unit = unitStr?.trim().toLowerCase();
  if (!unit) return num;

  if (["lakh", "lakhs", "lac", "lacs"].includes(unit)) {
    return Math.round(num * 100000);
  }
  if (unit === "k" || unit === "thousand") {
    return Math.round(num * 1000);
  }
  if (["cr", "crore", "crores"].includes(unit)) {
    return Math.round(num * 10000000);
  }

  return num;
}

/**
 * Legacy compatibility wrapper returning number or null.
 */
export function parseRequestedBudget(brief: string): number | null {
  const result = extractRequestedBudget(brief);
  return result.amount;
}
