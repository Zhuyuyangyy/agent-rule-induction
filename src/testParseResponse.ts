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

// Test 1: JSON query
test("JSON query returns action query", () => {
  const r = parseResponse('{"action":"query","x":[3,4,5]}', true);
  return r.action === 'query' && r.x?.[0] === 3;
});

// Test 2: JSON final
test("JSON final returns action final", () => {
  const r = parseResponse('{"action":"final","rule_id":"EQ_x0_4"}', true);
  return r.action === 'final' && r.ruleId === 'EQ_x0_4';
});

// Test 3: Markdown fenced JSON final
test("Markdown fenced JSON final works", () => {
  const r = parseResponse('```json\n{"action":"final","rule_id":"EVEN_x1"}\n```', true);
  return r.action === 'final' && r.ruleId === 'EVEN_x1';
});

// Test 4: Loose mode legacy ANSWER
test("Legacy ANSWER: works in loose mode", () => {
  const r = parseResponse('ANSWER: EQ_x0_4', false);
  return r.action === 'final' && r.ruleId === 'EQ_x0_4';
});

// Test 5: Strict mode rejects rule_id in reasoning text
test("Rule ID in reasoning: not final in strict mode", () => {
  const r = parseResponse('I think EQ_x0_4 is likely.', true);
  return r.action === null;
});

test("Rule ID in reasoning: final in loose mode (legacy)", () => {
  const r = parseResponse('I think EQ_x0_4 is likely.', false);
  return r.action === 'final' && r.ruleId === 'EQ_x0_4';
});

// Test 6: Scaffold-style reasoning with query (strict)
test("Scaffold reasoning JSON with query: strict mode extracts query", () => {
  const text = `{"top_3_hypotheses":["EQ_x0_0","EQ_x0_2","EVEN_x0"],"why_discriminative":"test","action":"query","x":[0,5,5]}`;
  const r = parseResponse(text, true);
  return r.action === 'query' && r.x?.[0] === 0;
});

// Test 7: Invalid JSON with no loose fallback in strict
test("Invalid format returns null in strict mode", () => {
  const r = parseResponse('I need to think more.', true);
  return r.action === null;
});

// Test 8: Final with extra fields
test("JSON final with extra fields works", () => {
  const r = parseResponse('{"action":"final","top_3_hypotheses":["A","B","C"],"why":"reason","rule_id":"ORDER_x0_x1"}', true);
  return r.action === 'final' && r.ruleId === 'ORDER_x0_x1';
});

// Test 9: Reject out-of-range query digits
test("Out-of-range query digits rejected", () => {
  const r = parseResponse('{"action":"query","x":[3,4,15]}', true);
  return r.action === null;
});

// Test 10: Reject non-integer query digits
test("Non-integer query digits rejected", () => {
  const r = parseResponse('{"action":"query","x":[3,4,5.5]}', true);
  return r.action === null;
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
