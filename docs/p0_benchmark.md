# P0 Rule Induction Benchmark

## Overview

P0 is the current formal deliverable of the Active Theory Discovery framework. It tests whether active querying and version-space reasoning improve an agent's ability to discover hidden rules in a controlled environment.

## Environment

- **Rule space**: 48 candidate boolean rules (e.g., `EVEN_x0`, `GT_x0_8`, `LT_x1_2`, `ORDER_x1_x0`)
- **Input space**: 3-dimensional integer vectors, each dimension 0..9 (1000 possible inputs)
- **Task**: Given a hidden rule, the agent must identify it through queries and/or reasoning

## Baselines

| Baseline | Description | API Required |
|----------|-------------|-------------|
| passive | Agent receives initial observations only, no querying | Yes |
| scaffold | Agent receives scaffolded observations with guided queries | Yes |
| active-random | Agent queries random inputs, then predicts rule | Yes |
| active-infogain | Agent queries inputs that maximize information gain (split entropy), then predicts rule | Yes |
| oracle-version-space | Optimal algorithm: greedy info-gain queries + always selects true rule | No |

## Metrics

- **accuracy**: Fraction of tasks where predicted rule matches hidden rule
- **query_count**: Average number of queries made per task
- **token_usage**: Average token consumption per task (LLM baselines only)
- **latency_ms**: Average latency per task
- **invalid_output_rate**: Fraction of tasks with invalid LLM output
- **failure_type**: Categorized failure reasons (wrong_rule, overconfident_guess, version_space_mismatch, etc.)

## Scoring (P0)

```
P0Score(T) = heldout_accuracy(T) - rule_length_penalty(T) - query_cost_penalty(T)
```

## Results (seed=42, 100 tasks)

| Condition | Accuracy | Avg Queries | Avg Tokens | Invalid Rate | Main Failure |
|-----------|----------|-------------|------------|--------------|--------------|
| active_random (algo) | 62.0% | 4.82 | 0 | 0.0% | version_space_mismatch |
| active_infogain (algo) | 100.0% | 3.34 | 0 | 0.0% | — |
| oracle | 100.0% | 3.34 | 0 | 0.0% | — |
| active (LLM) | 17.0% | 4.74 | 3754 | 0.0% | overconfident_guess |
| passive (LLM) | 4.0% | 0.00 | 357 | 1.0% | overconfident_guess |
| scaffold (LLM) | 28.7% | 4.56 | 7627 | 0.0% | wrong_rule |

### Key Findings

1. **Algorithm-level**: active-infogain achieves 100% accuracy with optimal query efficiency (3.34 queries), matching oracle upper bound. It significantly outperforms active-random (62%, p<0.0001, d=0.779).

2. **LLM-level**: The LLM (deepseek-chat) does not effectively utilize active querying information. Active-infogain (17%) underperforms even active-random (62%) at the algorithm level. Main failure modes: overconfident_guess (30), version_space_mismatch (24), wrong_rule (29).

3. **Negative result honestly reported**: The gap between algorithm-level and LLM-level performance is a significant finding. The algorithm works; the LLM implementation needs improvement.

## Reproduction

```bash
# Generate tasks
npm run p0:gen -- --n 100 --seed 42

# Run algorithm baselines (no API needed)
npm run p0:benchmark -- --n 100 --seed 42 --skip-llm --experiment-id main_seed42

# Run LLM baselines (requires OPENAI_API_KEY)
export OPENAI_API_KEY=your_key_here
export OPENAI_BASE_URL=https://api.deepseek.com/v1  # if using DeepSeek
npm run p0:benchmark -- --n 100 --seed 42 --experiment-id main_seed42 --model deepseek-chat --base-url "$OPENAI_BASE_URL"

# Analyze results
npm run p0:analyze -- --dir results/main_seed42 --tasks results/p0/tasks_seed42.json --output-dir results/main_seed42
```

## Output Structure

```
results/<experiment_id>/
  manifest.json          # Experiment metadata (seed, model, SHA256, timestamps)
  tasks.jsonl            # Task definitions
  passive/results.jsonl  # Per-task results for each condition
  scaffold/results.jsonl
  active_random/results.jsonl
  active_infogain/results.jsonl
  active/results.jsonl
  oracle/results.jsonl
  report.md              # Human-readable report
  summary.csv            # Machine-readable summary
  failure_cases.jsonl    # Detailed failure analysis
```
