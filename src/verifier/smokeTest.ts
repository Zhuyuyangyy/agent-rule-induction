/**
 * Smoke test for the VerifierClient adapter.
 *
 * These tests require Python + SymPy to be installed.
 * If the verifier is not available, tests are skipped with a clear message.
 */

import { VerifierClient } from "./verifierClient.js";

const TIMEOUT = 15_000;

async function smokeTest() {
  console.log("Testing VerifierClient...");

  const client = new VerifierClient({ timeoutMs: TIMEOUT });

  // Test 1: Equivalence pass
  console.log("  1. Equivalence pass...");
  const eq1 = await client.checkEquivalence("(x+1)**2", "x**2+2*x+1");
  if (!eq1.valid) {
    throw new Error(`Equivalence pass failed: ${JSON.stringify(eq1.violations)}`);
  }
  console.log("     OK");

  // Test 2: Equivalence fail
  console.log("  2. Equivalence fail...");
  const eq2 = await client.checkEquivalence("x**2", "x**3");
  if (eq2.valid) {
    throw new Error("Equivalence fail should not be valid");
  }
  console.log("     OK");

  // Test 3: Dimension pass
  console.log("  3. Dimension pass...");
  const dim1 = await client.checkDimension(
    "G*m1*m2/r**2",
    { G: "L^3 M^-1 T^-2", m1: "M", m2: "M", r: "L" },
    "M L T^-2",
  );
  if (!dim1.valid) {
    throw new Error(`Dimension pass failed: ${JSON.stringify(dim1.violations)}`);
  }
  console.log("     OK");

  // Test 4: Dimension fail
  console.log("  4. Dimension fail...");
  const dim2 = await client.checkDimension("m + c**2", { m: "M", c: "L T^-1" }, "M");
  if (dim2.valid) {
    throw new Error("Dimension fail should not be valid");
  }
  console.log("     OK");

  // Test 5: Canonicalize
  console.log("  5. Canonicalize...");
  const canon = await client.canonicalize("x**2 + 2*x + 1");
  if (!canon.valid || !canon.canonical_expr) {
    throw new Error(`Canonicalize failed: ${JSON.stringify(canon.violations)}`);
  }
  console.log(`     OK (canonical: ${canon.canonical_expr})`);

  // Test 6: Timeout handling
  console.log("  6. Timeout handling...");
  const timeoutClient = new VerifierClient({ timeoutMs: 1 });
  const timeoutResult = await timeoutClient.canonicalize("x**2 + 2*x + 1");
  // With 1ms timeout, it should either timeout or succeed (if very fast)
  // We just check it returns a valid structure
  if (typeof timeoutResult.valid !== "boolean") {
    throw new Error("Timeout result should have valid boolean");
  }
  console.log(`     OK (valid=${timeoutResult.valid})`);

  console.log("  All VerifierClient smoke tests passed!");
}

export async function runVerifierSmokeTests() {
  try {
    await smokeTest();
  } catch (e: any) {
    if (e.message?.includes("ENOENT") || e.message?.includes("spawn")) {
      console.log("  SKIPPED: Python/SymPy verifier not available");
      console.log(`  Reason: ${e.message}`);
      return;
    }
    throw e;
  }
}

// Run when invoked directly
if (process.argv[1]?.endsWith("smokeTest.ts")) {
  runVerifierSmokeTests().catch((e: any) => {
    console.error(`FAIL: ${e.message}`);
    process.exit(1);
  });
}
