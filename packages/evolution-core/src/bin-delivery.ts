#!/usr/bin/env node

import { runDeliveryCli } from "./delivery-cli.js";

runDeliveryCli(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(
      `cyclewarden-deliver: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
);
