---
applyTo: "**/*.{test,spec}.{ts,tsx,js,jsx},**/e2e/**"
---

# Test instructions

- Test observable behavior and failure cases, not implementation trivia.
- Reproduce a bug before fixing it when practical.
- Keep assertions meaningful; do not weaken or delete tests to make a change
  pass.
- Avoid mocks when a lightweight real boundary gives stronger confidence.
- Make async waits depend on user-visible or API state, not arbitrary sleeps.
