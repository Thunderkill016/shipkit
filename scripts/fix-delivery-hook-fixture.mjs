#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const path = "packages/evolution-core/src/delivery-hardening.test.ts";
let source = await readFile(path, "utf8");
const broken = `    await writeFile(hookPath, "#!/bin/sh
exit 91
", { encoding: "utf8", mode: 0o755 });`;
const fixed = `    await writeFile(hookPath, "#!/bin/sh\\nexit 91\\n", {
      encoding: "utf8",
      mode: 0o755,
    });`;
if (!source.includes(broken)) {
  throw new Error("broken commit-hook fixture literal was not found");
}
source = source.replace(broken, fixed);
await writeFile(path, source, "utf8");
console.log("Fixed delivery commit-hook fixture literal.");
