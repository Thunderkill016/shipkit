#!/usr/bin/env node

import { runPublicResearchCli } from "./public-cli.js";

runPublicResearchCli(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(
      `shipkit-research-public: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
);
