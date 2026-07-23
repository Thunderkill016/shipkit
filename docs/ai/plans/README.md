# Active implementation plans

Store dated plans here:

```text
YYYY-MM-DD-short-name.md
```

Create a plan from `../templates/IMPLEMENTATION_PLAN.md` when work crosses
subsystems, touches sensitive data or security, changes public interfaces, or
will produce a broad diff.

## Status values

- `proposed` — not approved for implementation;
- `active` — accepted and being implemented;
- `blocked` — waiting on a decision or dependency;
- `completed` — shipped and linked to the PR;
- `superseded` — replaced by another plan.

Keep completed plans when they explain important implementation history. Remove
low-value plans that only repeat the final code.
