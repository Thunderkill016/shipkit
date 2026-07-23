# Persistence Milestone Decision

For the next Shipkit milestone, the accepted persistence platform is Ubuntu 24.04 with Node.js 22 on a local filesystem that supports file and directory `fsync` plus atomic same-filesystem rename.

The product may rely on PR #22 for process-crash recovery and competing-writer serialization only within that boundary. It may not advertise Windows, macOS, network-filesystem, universal power-loss, or hostile-writer guarantees.

This decision allows the focused v2 persistence baseline to merge while keeping broader durability work separate and visible.
