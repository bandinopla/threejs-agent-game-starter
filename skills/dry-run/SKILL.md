---
name: dry-run
description: Investigate and describe how a requested repository change would be implemented without changing repository state. Use when the user asks for a dry run, read-only implementation plan, simulated change, change preview, or an explanation of what an agent would do before authorizing edits.
---

# Dry Run

Analyze the requested change using the repository's actual code, documentation, and applicable `AGENTS.md` files. Produce an evidence-based implementation plan without performing the implementation.

## Preserve repository state

- Do not create, edit, delete, rename, move, generate, or format files, including a report file.
- Do not install dependencies, update lockfiles, start servers, build, test, deploy, or run generators. These commands may create artifacts even when used only for validation.
- Do not use commands with side effects. Restrict tools and shell commands to inspection and search.
- Do not apply patches, stage changes, commit, or alter branches.
- If the requested task normally requires a state-changing command, list the exact command in the plan but do not execute it.
- If the user explicitly requests an output file while also requesting a dry run, explain that creating it would violate dry-run mode and return the report in the response instead.

## Investigate

1. Read the applicable `AGENTS.md` instructions.
2. Inspect only the documentation and source files relevant to the requested task.
3. Trace the affected behavior far enough to identify integration points, generated files, and verification needs.
4. Distinguish verified repository facts from assumptions. List unresolved questions only when repository inspection cannot answer them.

Do not claim that a file was read or a behavior was verified unless it was actually inspected.

## Report

Return a numbered implementation plan. For each step include, when applicable:

- the action the implementing agent would take;
- files it would inspect or change and why;
- relevant repository documentation or agent instructions;
- commands it would run during implementation;
- expected result and important constraints.

Finish with these concise sections:

- **Files inspected**: files actually read during this dry run.
- **Files that would change**: expected hand-edited files.
- **Generated files**: outputs created by generators or builds; state which command produces them.
- **Verification**: commands and manual checks that should run after implementation.
- **Risks and open questions**: uncertainties, compatibility concerns, or `None`.

Do not provide hidden chain-of-thought. Provide conclusions, repository evidence, and the observable implementation plan needed to evaluate the proposed work.
