#!/bin/bash
# Run from your repo root. Moves the superseded V1 stack into legacy/,
# preserving git history via `git mv`.
set -e

mkdir -p legacy
git mv EazyPortfolio legacy/EazyPortfolio
git mv EazyPortfolio-web legacy/EazyPortfolio-web
git mv .claude legacy/.claude
git mv server legacy/server
git mv .portfolio legacy/.portfolio

echo "Done. Review with 'git status', then commit:"
echo '  git commit -m "chore: archive V1 (.claude pipeline) into legacy/"'
