#!/usr/bin/env sh

# Enforces the project's commit message rules:
#   1. No Co-Authored-By trailer, no "Generated with" line, and no mention
#      of Claude or Anthropic.
#   2. At most 3 non-empty lines.
# Lines starting with '#' are git's own comments and are ignored.

message_file="$1"
max_lines=3

message="$(grep -v '^#' "$message_file")"

if printf '%s\n' "$message" | grep -qiE 'co-authored-by|claude|anthropic|generated with|🤖'; then
  echo "🚫 Commit message contains an attribution trailer or a tool mention."
  echo "➡️ Remove Co-Authored-By, 'Generated with', Claude or Anthropic."
  exit 1
fi

line_count="$(printf '%s\n' "$message" | grep -c '[^[:space:]]')"

if [ "$line_count" -gt "$max_lines" ]; then
  echo "🚫 Commit message has $line_count lines; the limit is $max_lines."
  echo "➡️ Use a one-line Conventional Commits subject, plus at most two short lines."
  exit 1
fi
