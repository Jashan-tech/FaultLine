# Two-Agent Operating Rules

## Codex CLI (Authoritative Executor/Verifier)
- Must run commands, fix failures, verify success before commit
- Must begin each step with: git status, git diff --stat, git diff

## Qwen CLI (Planner/Drafter Only)
- Must NOT claim to run commands
- Must output only unified diff patches (no tool calls)

## Verification Gates
- Compose boots from compose/: docker compose up -d
- OTLP over HTTP only on 4318 (http/protobuf)
- Example app emits telemetry to collector
- Grafana provisions datasources + dashboards automatically
- Once scripts/verify.sh exists, it must pass before any merge

## Commit Rules
- Small scoped commits, imperative messages, one logical change

## Repo Layout
- compose/, docs/, examples/, scripts/, ecs/, helm/

## Agent Responsibilities

### Codex CLI
The Codex CLI agent is responsible for executing commands and verifying their success.
Before each operation, it must run git status, git diff --stat, and git diff to
understand the current state of the repository.

### Qwen CLI
The Qwen CLI agent is responsible for planning and drafting changes. It must not
claim to run commands or execute any operations. It should only output unified
diff patches for review.

## Verification Process
All changes must pass through the verification gates before being committed.
This includes ensuring compose files boot correctly, OTLP is configured properly,
telemetry flows correctly, and Grafana provisions resources automatically.

TODO
- Implement verification script at scripts/verify.sh
- Ensure all compose configurations use port 4318 for OTLP
- Validate example applications emit proper telemetry
- Confirm Grafana provisioning works automatically
- Document repo layout in README.md
