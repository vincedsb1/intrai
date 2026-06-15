---
name: test
description: Run the current project's relevant test, lint, typecheck, or validation commands and report failures clearly.
---

Run all tests (backend + frontend) and report results.

Execute in this order:

1. **Backend Tests**: Run `cd backend && python3 -m pytest -v --tb=short`
   - Show full output
   - If failures: Analyze and suggest fixes

2. **Frontend Tests**: Run `cd frontend && pnpm test` (if pnpm installed)
   - Show full output
   - If failures: Analyze and suggest fixes
   - If pnpm not installed: Show message and skip

3. **Summary**:
   - Report: ✅ if all pass, or ❌ if any fail
   - For failures: Provide clear analysis of what failed and why
   - Suggest next action (fix code or update tests)
