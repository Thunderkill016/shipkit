#!/usr/bin/env node

import { runPublicSearchCli } from "./search-cli.js";

runPublicSearchCli(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(
      `shipkit-research-search: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
);
