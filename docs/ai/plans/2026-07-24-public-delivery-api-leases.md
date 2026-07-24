# Protect exported delivery APIs with operation leases

**Date:** 2026-07-24  
**Parent:** issue #44  
**Predecessor:** merged PR #50  
**Status:** implementation candidate

## Decision

Make the package-root `executeDelivery`, `verifyDelivery`, and `publishDelivery` functions lease-protected by default. Their raw mutation implementations remain source-internal and are not re-exported through the package entrypoint.

## Why

PR #50 protected the CLI path, but a package consumer could still call exported delivery functions directly and bypass write-ahead checkpoints, overlap prevention, heartbeat ownership, child-process tracking, and stale-operation recovery.

## Contract

- public function names, inputs, and result shapes remain unchanged;
- each public call acquires the same per-cycle operation lease before delivery preconditions or mutation begin;
- handled delivery outcomes complete the operation normally;
- thrown precondition and boundary failures persist a terminal `failed` operation checkpoint;
- the CLI calls the public façade once and reads the terminal checkpoint for output, avoiding nested leases;
- raw execution, verification, and publication implementations remain available only to internal source modules;
- recovery and operation inspection stay separate and explicit.

## Verification

Regression coverage must prove that package-root calls for execute, verify, and publish leave integrity-valid terminal checkpoints even when they fail before mutation. Existing CLI, engine, publication, recovery, package, sandbox, Evolution proof, and browser suites must remain green.

## Boundaries

This remains a local-host lease. It does not add distributed ownership, remote execution, automatic orphan-candidate cleanup, publication subprocess tracking, merge, deployment, production writes, outcome learning, or external product validation.
