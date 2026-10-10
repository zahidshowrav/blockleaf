#!/usr/bin/env sh

# Protected branches # add branch names with space
protected_branches="main"

# Get current branch
current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"

for branch in $protected_branches; do
  if [ "$current_branch" = "$branch" ]; then
    echo "🚫 You cannot commit or push directly to '$branch' branch!"
    echo "➡️ Please use a feature branch instead."
    exit 1
  fi
done
