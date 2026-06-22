# Verifier Client Adapter

TypeScript adapter for the SymPy verifier sidecar.

## Architecture

```
TypeScript (main loop)
  └─ VerifierClient
       └─ spawn Python subprocess
            └─ tools/sympy_verifier/verify_expr.py
                 └─ JSON in (stdin) → JSON out (stdout)
```

## Usage

```typescript
import { VerifierClient } from "./verifierClient.js";

const client = new VerifierClient();

// Equivalence check
const eqResult = await client.checkEquivalence("(x+1)**2", "x**2+2*x+1");
console.log(eqResult.valid); // true

// Dimension check
const dimResult = await client.checkDimension(
  "G*m1*m2/r**2",
  { G: "L^3 M^-1 T^-2", m1: "M", m2: "M", r: "L" },
  "M L T^-2"
);
console.log(dimResult.valid); // true

// Canonicalize
const canon = await client.canonicalize("sin(2*x)");
console.log(canon.canonical_expr); // "2*sin(x)*cos(x)"
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `verifierPath` | `tools/sympy_verifier/verify_expr.py` | Path to Python verifier |
| `timeoutMs` | `10000` | Timeout in milliseconds |
| `pythonPath` | `python` | Python interpreter path |

## Error Handling

- If the verifier times out, returns `{ valid: false, violations: ["Verifier timed out..."] }`
- If the verifier crashes, returns `{ valid: false, violations: ["Verifier exited with code N", ...] }`
- If output is unparseable, returns `{ valid: false, violations: ["Failed to parse verifier output..."] }`
- The client never throws; it always returns a `VerifierResult`.

## Scope

This is **optional infrastructure only**. It does not modify P0/P1 benchmark code.
It is intended for future P2/P3 integration where verifier constraints reject
invalid symbolic candidates.
