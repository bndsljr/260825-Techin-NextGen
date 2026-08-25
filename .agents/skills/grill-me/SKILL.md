---
name: grill-me
description: Relentlessly interview and stress-test the user about a plan, design, architectural decision, or idea until every branch of the decision tree is fully resolved. Use when the user asks to "grill me", stress-test a plan, conduct a design interview, interrogate a proposal, or deeply flesh out requirements before implementation.
---
# Grill Me

Systematically interrogate and pressure-test plans, ideas, and designs before implementation to surface hidden assumptions, resolve dependencies, and reach shared clarity.

## When to Use

- When the user asks to "grill me" or mentions `/grill-me`.
- When the user wants to stress-test, interrogate, or pressure-test a plan, design, or architecture.
- Before jumping into implementation on complex tasks, features, or workflows.
- When clarifying ambiguous requirements, PRDs, or decision branches.

## Workflow

1. **Understand the Goal**: Identify the core concept, feature, or proposal the user wants to grill.
2. **Explore Existing Context**: If questions can be answered by inspecting the workspace or existing codebase, inspect them first before asking.
3. **Ask Focused Questions with Recommendations**:
   - Ask questions sequentially, walking down each branch of the decision tree.
   - Resolve prerequisites and dependencies between decisions step by step.
   - For every question, provide your recommended answer or default option so the user can easily confirm or adjust.
4. **Distinguish Low vs High Fidelity**:
   - Focus on low-fidelity architectural and requirement decisions (data model, scope, edge cases, error handling, API boundaries).
   - If a question requires visual feel or prototyping (high-fidelity), flag it and suggest a quick prototype.
5. **Summarize and Align**:
   - Once all branches are explored and dependencies resolved, summarize the finalized design, decisions made, and next steps.

## Gotchas

- Do not dump 20 unorganized questions at once. Keep questions structured and build on prior answers.
- Avoid being passive. Challenge weak assumptions, surface edge cases, and provide clear recommended choices.
- Stop when the frontier is empty and shared understanding is reached.
