#!/usr/bin/env node

import { runSandboxCli } from "./sandbox-cli.js";

runSandboxCli(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(
      `cyclewarden-sandbox-check: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
);
