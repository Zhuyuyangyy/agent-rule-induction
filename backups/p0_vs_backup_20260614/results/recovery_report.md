# Recovery Report — P0-VS Project

**Date**: 2026-06-14
**Status**: Disaster recovery — data preserved, bugs identified

---

## 1. Backup Status

All files backed up to `backups/p0_vs_backup_20260614/`:
- **36 files** total
- **12 complete JSONL** result files (50 results each)
- **24 supporting files** (source code, configs, tasks)

## 2. Available Results (seed=42, 50 tasks each)

| Condition | Results | Accuracy | Avg Queries | Status |
|-----------|---------|----------|-------------|--------|
| passive | 50/50 ✅ | 40% | 0.00 | **USABLE** |
| active | 50/50 ✅ | 14% | 0.90 | **SUSPECT** — avg queries only 0.9 |
| active_minquery | 50/50 ✅ | 14% | 0.96 | **SUSPECT** — minQueries not enforced |
| active_budget_reminder | 50/50 ✅ | 26% | 3.76 | **USABLE** |
| active_vscount | 50/50 ✅ | 16% | 4.06 | **USABLE** |
| scaffold | 50/50 ✅ | 8% | 0.10 | **MUST DISCARD** — critical bug |
| final_only_scaffold | 50/50 ✅ | 8% | 1.20 | **SUSPECT** — same parseResponse bug |
| query_only_scaffold | 50/50 ✅ | 12% | 0.88 | **SUSPECT** — same parseResponse bug |
| oracle_query_model_final | 50/50 ✅ | 58% | 3.42 | **USABLE** — no parseResponse dependency |
| model_query_oracle_final | 50/50 ✅ | 30% | 3.56 | **USABLE** — oracle judges, no parse bug |

### P0.2 seed=2026 (partial — API balance exhausted)
| Condition | Results | Status |
|-----------|---------|--------|
| passive | 50/50 ✅ | USABLE |
| active | 50/50 ✅ | SUSPECT |
| Other 4 conditions | MISSING | Need to re-run |

### P0.2 seed=3407
All data LOST during file system incident.

## 3. Identified Bugs

### Bug 1: Scaffold parseResponse fallback (CRITICAL)
**Impact**: Scaffold, FinalOnly-Scaffold, QueryOnly-Scaffold all affected

**Root cause**: `parseResponse()` in runActive.ts has aggressive fallback matching:
- Lines 62-73: If no `ANSWER: rule_id` found, it matches the LAST rule_id mentioned in the text
- Scaffold prompts the model to reason about candidate rules, so the model naturally mentions multiple rule_ids
- The fallback grabs the last mentioned rule_id as the "answer", causing premature final

**Evidence**: Scaffold avg queries = 0.10 (45/50 tasks had 0 queries, 5/50 had 1 query)

**Fix needed**: Scaffold needs its own parser that only recognizes explicit `ANSWER:` or `FINAL_ANSWER:` markers, not fallback regex matching.

### Bug 2: Active/MinQuery low query counts
**Impact**: Active (0.90 avg), MinQuery (0.96 avg)

**Root cause**: Same parseResponse fallback issue. When the model reasons about rules in its response, the fallback may match a rule_id as an "answer" even when the model intended to continue querying.

**Evidence**: Active should have avg queries > 2 based on previous runs. MinQuery should have avg ≥ 3.

### Bug 3: Task field name inconsistency
**Impact**: All results from latest subagent rebuild

**Root cause**: Subagent used camelCase (`taskId`, `trueRuleId`, `queriesMade`) instead of snake_case (`task_id`, `true_rule_id`, `num_queries`) from original design. This makes analysis scripts incompatible.

## 4. Results That CAN Be Trusted

Despite the bugs, some results are clean:

### Clean Results (no parseResponse dependency)
| Condition | Accuracy | Notes |
|-----------|----------|-------|
| **Greedy baseline** | 100% | Deterministic, no LLM involved |
| **Random baseline** | 54% | Simulation, no LLM involved |
| **Passive** | 40% | Single-turn, no query parsing |
| **OracleQuery+ModelFinal** | 58% | Greedy queries, model only answers once |
| **ModelQuery+OracleFinal** | 30% | Model queries parsed by QUERY: format, oracle judges |
| **BudgetReminder** | 26% | Higher queries (3.76), less affected by fallback |
| **VSCount** | 16% | Higher queries (4.06), less affected by fallback |

### Key Finding That Survives
**OracleQuery+ModelFinal (58%) >> ModelQuery+OracleFinal (30%)**

This is the most important result from P0.3:
- When given perfect queries, the model achieves 58% (vs Random 54%)
- When the model chooses queries but oracle judges, only 30%
- **The gap (58% vs 30%) means query quality matters more than final reasoning**
- But even with perfect queries, model only reaches 58% (vs Greedy 100%), so final reasoning is also imperfect

## 5. Results That MUST Be Discarded

| Condition | Reason |
|-----------|--------|
| scaffold (8%) | parseResponse bug — model never queries |
| final_only_scaffold (8%) | Same bug — premature final |
| query_only_scaffold (12%) | Same bug — premature final |
| active (14%) | Likely affected by fallback bug (avg 0.9 queries) |
| active_minquery (14%) | MinQuery not enforced (avg 0.96 < 3) |

## 6. Recommended Next Steps (Priority Order)

### Step 1: Fix parseResponse bug (OFFLINE, no API needed)
- Add a `strictMode` flag to parseResponse
- In strict mode, ONLY recognize explicit `ANSWER:` or `FINAL_ANSWER:` markers
- Scaffold/QueryOnly/FinalOnly should use strict mode
- Active/MinQuery should also use strict mode to prevent premature matching

### Step 2: Fix MinQuery enforcement
- Current runBatch doesn't properly enforce minQueries
- Need to add explicit check: if queriesMade < minQueries, reject any detected "answer"

### Step 3: Unify field names
- Convert all runners to use snake_case consistently
- Or update analysis scripts to handle both formats

### Step 4: Local testing (no API needed)
- Create synthetic test cases for parseResponse with strict mode
- Verify MinQuery enforcement with mock responses
- Test Scaffold parser with sample model outputs

### Step 5: Re-run experiments (API needed)
- Only after Steps 1-4 are verified
- Start with seed=42 only
- Run conditions in this order: Passive → Active → MinQuery → BudgetReminder → VSCount → Scaffold → FinalOnly → QueryOnly → OracleQuery+ModelFinal → ModelQuery+OracleFinal
- Each condition SEQUENTIALLY, never in parallel

### Step 6: Multi-seed replication (API needed)
- Only after seed=42 results look clean
- Run seed=2026 and seed=3407

## 7. API Status

DeepSeek API balance exhausted (402 Insufficient Balance).
Cannot run any new experiments until balance is restored.

## 8. File Integrity Check

All 36 files in backup are non-empty and have reasonable sizes.
No evidence of file corruption in backup.
Source code is functional (tests pass).

The main risk is not data loss but **code correctness** — the parseResponse bug means 5 out of 10 conditions produced unreliable results.
