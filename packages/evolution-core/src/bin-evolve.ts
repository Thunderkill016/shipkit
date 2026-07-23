#!/usr/bin/env node

import { runEvolutionCli } from "./cli.js";

runEvolutionCli(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(
      `shipkit-evolve: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
);
