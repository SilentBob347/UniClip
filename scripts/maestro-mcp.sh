#!/usr/bin/env bash
set -euo pipefail

# GUI-launched agents may not inherit the shell's Maestro PATH entry.
if command -v maestro >/dev/null 2>&1; then
  exec maestro mcp
fi
if [[ -x "${HOME}/.maestro/bin/maestro" ]]; then
  exec "${HOME}/.maestro/bin/maestro" mcp
fi
printf '%s\n' 'Maestro CLI is required: https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli' >&2
exit 127
