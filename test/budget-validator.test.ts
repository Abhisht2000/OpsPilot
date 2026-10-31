import test from "node:test";
import assert from "node:assert/strict";
import {
  validateBudget,
  extractRequestedBudget,
  parseRequestedBudget,
  type BudgetItem,
} from "../app/lib/budget-validator.ts";

test("Budget Parser - extracts common Indian Rupee formats", () => {
  // ₹50,000 symbol
  assert.equal(parseRequestedBudget("Organize a hackathon with ₹50,000 budget"), 50000);
  assert.equal(parseRequestedBudget("Budget: ₹ 1,20,000 for college fest"), 120000);

  // INR format
  assert.equal(parseRequestedBudget("Total budget INR 50000 for the event"), 50000);
  assert.equal(parseRequestedBudget("We have 50000 INR to spend"), 50000);

  // 'k' format
  assert.equal(parseRequestedBudget("Plan an AI workshop with 50k budget"), 50000);
  assert.equal(parseRequestedBudget("budget of 75k for catering and prizes"), 75000);

  // 'lakh' / 'lac' format
  assert.equal(parseRequestedBudget("Campus tech fest with 5 lakh budget"), 500000);
  assert.equal(parseRequestedBudget("Budget is 1.5 lakhs"), 150000);
  assert.equal(parseRequestedBudget("Total budget: 2 lac"), 200000);

  // Rs format
  assert.equal(parseRequestedBudget("Allocated Rs. 80,000 for event"), 80000);
  assert.equal(parseRequestedBudget("Budget within Rs 45000"), 45000);
});

test("Budget Parser - prompts for clarification when budget is missing or ambiguous", () => {
  const result = extractRequestedBudget("Plan a 2-day hackathon for 200 participants with 4 workshops");
  assert.equal(result.amount, null);
  assert.equal(result.needsClarification, true);
  assert.match(result.message || "", /Please specify your target budget/);
});

test("Budget Validator - perfectly balanced budget", () => {
  const items: BudgetItem[] = [
    { category: "Prizes", amount: 25000, details: "Cash rewards for top 3 teams" },
    { category: "Food & Beverages", amount: 15000, details: "Snacks, dinner, and drinks" },
    { category: "Logistics", amount: 10000, details: "Badges, banners, and stickers" },
  ];

  const result = validateBudget(items, 50000);
  assert.equal(result.valid, true);
  assert.equal(result.matches, true);
  assert.equal(result.status, "balanced");
  assert.equal(result.difference, 0);
  assert.equal(result.allocated, 50000);
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 0);
  assert.match(result.disclaimer, /Arithmetic validation only/);
});

test("Budget Validator - under-allocation reports warning and remaining amount", () => {
  const items: BudgetItem[] = [
    { category: "Prizes", amount: 20000, details: "Top 3 teams" },
    { category: "Logistics", amount: 10000, details: "Swag and badges" },
  ];

  const result = validateBudget(items, 50000);
  assert.equal(result.valid, false);
  assert.equal(result.matches, false);
  assert.equal(result.status, "under_allocated");
  assert.equal(result.difference, 20000);
  assert.equal(result.allocated, 30000);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /20,000 remains unallocated/);
});

test("Budget Validator - over-allocation reports error and excess amount", () => {
  const items: BudgetItem[] = [
    { category: "Prizes", amount: 40000, details: "Top teams" },
    { category: "Venue", amount: 20000, details: "Auditorium booking" },
  ];

  const result = validateBudget(items, 50000);
  assert.equal(result.valid, false);
  assert.equal(result.matches, false);
  assert.equal(result.status, "over_allocated");
  assert.equal(result.difference, -10000);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /Budget exceeds requested limit by ₹10,000/);
});

test("Budget Validator - flags negative amounts, invalid data, or empty breakdown", () => {
  // Empty items
  const emptyRes = validateBudget([], 50000);
  assert.equal(emptyRes.valid, false);
  assert.equal(emptyRes.status, "invalid");
  assert.match(emptyRes.errors[0], /Budget breakdown is empty/);

  // Negative amount
  const negativeRes = validateBudget(
    [{ category: "Food", amount: -500, details: "Negative food" }],
    50000
  );
  assert.equal(negativeRes.valid, false);
  assert.equal(negativeRes.status, "invalid");

  // Missing category
  const missingCatRes = validateBudget(
    [{ category: "", amount: 50000, details: "Nameless" }],
    50000
  );
  assert.equal(missingCatRes.valid, false);
  assert.equal(missingCatRes.status, "invalid");
});
