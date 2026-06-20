// Test parseResponse strictMode fix
import { parseResponse } from "./runActive.js";

let passed = 0, failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) { passed++; console.log(`  ✓ ${name}`); }
    else { failed++; console.log(`  ✗ ${name} — assertion failed`); }
  } catch (e: any) { failed++; console.log(`  ✗ ${name} — ${e.message}`); }
}

console.log("=== parseResponse strictMode Tests ===\n");

// Test 1: Explicit ANSWER: should work in both modes
test("Explicit ANSWER: works in non-strict mode", () => {
  const r = parseResponse("Let me think...\nANSWER: EQ_x0_4", false);
  return r.answer === "EQ_x0_4";
});

test("Explicit ANSWER: works in strict mode", () => {
  const r = parseResponse("Let me think...\nANSWER: EQ_x0_4", true);
  return r.answer === "EQ_x0_4";
});

// Test 2: FINAL_ANSWER: should work in both modes
test("FINAL_ANSWER: works in non-strict mode", () => {
  const r = parseResponse("Analysis done.\nFINAL_ANSWER: EVEN_x1", false);
  return r.answer === "EVEN_x1";
});

test("FINAL_ANSWER: works in strict mode", () => {
  const r = parseResponse("Analysis done.\nFINAL_ANSWER: EVEN_x1", true);
  return r.answer === "EVEN_x1";
});

// Test 3: Rule ID mentioned in reasoning should NOT match in strict mode
test("Rule ID in reasoning: matches in non-strict mode (old behavior)", () => {
  const r = parseResponse("Let me check EQ_x0_4 and EVEN_x1.\nQUERY: 3,4,5", false);
  // In non-strict, fallback matches last rule_id mentioned
  return r.answer !== null && r.queries.length === 1;
});

test("Rule ID in reasoning: does NOT match in strict mode", () => {
  const r = parseResponse("Let me check EQ_x0_4 and EVEN_x1.\nQUERY: 3,4,5", true);
  return r.answer === null && r.queries.length === 1;
});

// Test 4: Scaffold-style reasoning with multiple rule mentions
test("Scaffold reasoning: strict mode ignores rule_ids in text", () => {
  const text = `STEP 1:
1. CONSISTENT_RULES: EQ_x0_0, EQ_x0_2, EVEN_x0, ODD_x0
2. DISCRIMINATION_ANALYSIS: Query (0,5,5) would separate EQ_x0_0 from others
3. QUERY: 0,5,5`;
  const r = parseResponse(text, true);
  return r.answer === null && r.queries.length === 1 && r.queries[0][0] === 0;
});

test("Scaffold reasoning: non-strict mode incorrectly matches rule_id", () => {
  const text = `STEP 1:
1. CONSISTENT_RULES: EQ_x0_0, EQ_x0_2, EVEN_x0, ODD_x0
2. DISCRIMINATION_ANALYSIS: Query (0,5,5) would separate EQ_x0_0 from others
3. QUERY: 0,5,5`;
  const r = parseResponse(text, false);
  // Non-strict matches the last rule_id mentioned (ODD_x0)
  return r.answer !== null;
});

// Test 5: QUERY parsing works in both modes
test("QUERY: works in non-strict mode", () => {
  const r = parseResponse("QUERY: 3,4,5", false);
  return r.queries.length === 1 && r.queries[0][0] === 3;
});

test("QUERY: works in strict mode", () => {
  const r = parseResponse("QUERY: 3,4,5", true);
  return r.queries.length === 1 && r.queries[0][0] === 3;
});

// Test 6: Both QUERY and ANSWER in same response
test("QUERY + ANSWER in same response: strict mode takes ANSWER", () => {
  const r = parseResponse("QUERY: 3,4,5\nANSWER: EQ_x0_4", true);
  return r.answer === "EQ_x0_4" && r.queries.length === 1;
});

// Test 7: No QUERY and no ANSWER
test("No query or answer: both modes return null answer", () => {
  const r1 = parseResponse("I need to think more.", false);
  const r2 = parseResponse("I need to think more.", true);
  return r1.answer === null && r2.answer === null;
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
