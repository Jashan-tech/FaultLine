# Repository Guidelines

## Project Structure & Module Organization
This repository is currently minimal and contains only `README.md` at the root.  
When adding implementation code, keep a predictable layout:

- `src/` for application code
- `tests/` for automated tests
- `assets/` for static files (images, fixtures, sample data)
- `docs/` for design notes and operational documentation

Group modules by feature, not by file type, once the codebase grows.

## Build, Test, and Development Commands
No build or test toolchain is configured yet. Use Git and shell commands for day-to-day work:

- `git status` checks working tree changes
- `git log --oneline -n 20` reviews recent history and message style
- `Get-ChildItem -Recurse` (PowerShell) inspects project files

If you add a runtime/toolchain (for example Node, Python, or Go), add root-level scripts/commands and document them in `README.md` and this file in the same PR.

## Coding Style & Naming Conventions
Use clear, descriptive names and keep naming consistent across files and folders.

- Files/directories: `kebab-case` (example: `incident-parser`)
- Variables/functions: follow the primary language convention for that module
- Keep functions focused and small; avoid hidden side effects
- Run the language formatter/linter before opening a PR

Prefer ASCII in source and docs unless Unicode is required.

## Testing Guidelines
There is no test framework configured yet. For new code, include tests in the same change.

- Place tests under `tests/` or next to modules with a `*.test.*` naming pattern
- Cover happy path, failure path, and one edge case per feature
- Document how to run tests in `README.md` once a framework is added

## Commit & Pull Request Guidelines
Current Git history is short (`first commit`), so conventions are still forming.

- Write commit messages in imperative mood, concise subject line, no trailing period
- Keep commits scoped to one logical change
- PRs should include: purpose, key changes, validation steps, and linked issue (if available)
- Include screenshots/log snippets when UI or behavior changes are visible
