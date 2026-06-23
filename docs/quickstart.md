# Quick Start Guide

Get started with Active Theory Discovery in 5 minutes.

## Prerequisites

- Node.js >= 18
- Python >= 3.8 (optional, for SymPy verifier)
- Git

## Install and Run

```bash
# Clone the repository
git clone https://github.com/Zhuyuyangyy/agent-rule-induction.git
cd agent-rule-induction

# Install dependencies
npm install

# Verify installation
npm run typecheck
npm test

# Run core benchmarks
npm run p1:benchmark:multi-noise
npm run p2:benchmark
npm run p3:benchmark
npm run p4:benchmark
npm run p5:benchmark
```

## One-Command Reproduce

```bash
npm run reproduce:core
```

## Audit Commands

```bash
# Check for forbidden claims
npm run audit:claims

# Verify artifact paths exist
npm run audit:artifacts
```

## What You'll See

Each benchmark produces:
- `results/<benchmark>/report.md` — Human-readable report
- `results/<benchmark>/summary.csv` — Machine-readable metrics
- `results/<benchmark>/failure_cases.jsonl` — Individual failure cases

## SymPy Verifier (Optional)

```bash
pip install sympy>=1.12
python -m pytest tools/sympy_verifier/tests -v
```

## Docker

```bash
docker build -t atd .
docker run atd
```

## No API Keys Required

All benchmarks are fully algorithmic. No LLM API keys are needed to reproduce the core results.
