#!/usr/bin/env node

import { runCandidateResearchCli } from "./candidate-cli.js";

runCandidateResearchCli(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(
      `cyclewarden-research-candidates: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
);
