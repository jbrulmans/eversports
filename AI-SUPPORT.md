# AI Support Disclosure

- Used **opencode** as a pair programmer throughout the project; AI wrote initial implementations based on architecture I directed, and I reviewed and adjusted every line.
- Key architectural decisions made by me, not AI: layered architecture with repository pattern, Zod for validation, date-fns for date math, branch-per-feature workflow, fixing legacy bugs rather than replicating them.
- Used different external AI models for independent code review of integral parts of the code. Adopting valid feedback; rejecting invalid feedback (renaming legacy error codes, adding error codes not in the legacy, hand-rolled date math).
- Critically evaluated all AI suggestions against the assignment requirements: rejected renaming legacy error codes (would violate the README), rejected hand-rolled date math (cited timezone edge cases), and pushed back on AI's initial dismissal of dynamic period states.
- AI wrote initial test suites; I identified coverage gaps (field normalization untested, boundary cases missing, period states not asserted) and directed AI to fill them.
