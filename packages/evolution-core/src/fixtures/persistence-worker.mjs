import { access, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { EvolutionStore, transitionCycle } from "../../dist/index.js";

const [root, cycleId, actor, gatePath, readyPath] = process.argv.slice(2);
if (!root || !cycleId || !actor || !gatePath || !readyPath) {
  process.stderr.write("usage: persistence-worker <root> <cycle-id> <actor> <gate> <ready>\n");
  process.exit(64);
}

async function waitForGate() {
  while (true) {
    try {
      await access(gatePath);
      return;
    } catch {
      await delay(10);
    }
  }
}

try {
  const store = new EvolutionStore(root, { lockTimeoutMs: 10_000, staleLockMs: 100 });
  const previous = await store.load(cycleId);
  await writeFile(readyPath, `${process.pid}\n`, "utf8");
  await waitForGate();
  const next = transitionCycle(previous, "observed", {
    actor,
    reason: `process writer ${actor} captured a baseline`,
    addArtifacts: { baseline: [`evidence:${actor}`] },
  });
  await store.save(previous, next);
  process.stdout.write(`${JSON.stringify({ ok: true, actor, stage: next.stage })}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}
