# Renaming from Shipkit to CycleWarden

Status: active compatibility guide<br>
Owner: Thunderkill016<br>
Date: 2026-07-24

CycleWarden is the new name of the project formerly called Shipkit. The rename
changes product-facing identifiers while preserving existing local lifecycle
state.

## Identifier changes

| Previous | Canonical |
| --- | --- |
| `Shipkit` | `CycleWarden` |
| `shipkit` | `cyclewarden` |
| `@shipkit/*` | `@cyclewarden/*` |
| `shipkit-*` binaries | `cyclewarden-*` binaries |
| `.shipkit` state directory | `.cyclewarden` state directory |
| `SHIPKIT_*` environment variables | `CYCLEWARDEN_*` environment variables |
| `NEXT_PUBLIC_SHIPKIT_MODE` | `NEXT_PUBLIC_CYCLEWARDEN_MODE` |

## Existing lifecycle state

No automatic move or rewrite occurs.

- A new project writes to `.cyclewarden`.
- If `.cyclewarden` does not exist but `.shipkit` does, the Evolution Core CLI
  and web workspace read `.shipkit` in place.
- If both exist, `.cyclewarden` wins.
- An explicit `--root` or `CYCLEWARDEN_STATE_ROOT` always wins.

To migrate manually after confirming the CLI is stopped:

```bash
mv .shipkit .cyclewarden
```

Keep a backup until `pnpm evolve -- status` and the intended cycle both load.
Do not merge two independently modified state directories.

## Environment compatibility

The web workspace and operational scripts prefer the new variables and
temporarily fall back to these old names:

- `NEXT_PUBLIC_SHIPKIT_MODE`;
- `SHIPKIT_STATE_ROOT`;
- `SHIPKIT_EVOLUTION_CLI`;
- `SHIPKIT_REVIEW_DATE`;
- `SHIPKIT_SANDBOX_IMAGE`;
- `SHIPKIT_PERSISTENCE_CRASH_POINT`.

Update local untracked `.env` files to the new names. The repository does not
rewrite secrets or ignored environment files.

## PostgreSQL development data

The Compose examples now use CycleWarden database names and a
`cyclewarden_pg` volume. Docker does not delete the previous volume, but it
will not attach it automatically under the new configuration.

Before switching an existing local database:

1. stop the old Compose project;
2. take a PostgreSQL dump or a verified volume backup;
3. restore into the new database configuration;
4. run `pnpm db:migrate`;
5. verify authentication and note isolation before removing any old volume.

This repository migration never deletes the previous database volume.

## GitHub repository

The source repository will be renamed from `Thunderkill016/shipkit` to
`Thunderkill016/cyclewarden` after the code migration is merged. GitHub normally
redirects old repository URLs, but local clones should still update explicitly:

```bash
git remote set-url origin git@github.com:Thunderkill016/cyclewarden.git
git remote -v
```

No domain purchase or deployment is part of the rename.
