#!/usr/bin/env bash
# spawn-install.sh - put `spawn` on your PATH.
#
# This installs only this repo's own wrapper. It downloads nothing and executes
# no third-party code; installing Hermes itself is a separate, explicit step
# that `spawn doctor` walks you through.
#
#   bash scripts/spawn-install.sh              # -> ~/.local/bin/spawn
#   PREFIX=/usr/local bash scripts/spawn-install.sh

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/spawn"
PREFIX="${PREFIX:-$HOME/.local}"
DEST_DIR="$PREFIX/bin"
DEST="$DEST_DIR/spawn"

[ -f "$SRC" ] || { echo "spawn-install: cannot find $SRC" >&2; exit 1; }

mkdir -p "$DEST_DIR"

# Symlink so a git pull updates the installed command too. Fall back to a copy
# on filesystems that refuse symlinks.
if ln -sfn "$SRC" "$DEST" 2>/dev/null; then
  echo "spawn-install: linked $DEST -> $SRC"
else
  install -m 0755 "$SRC" "$DEST"
  echo "spawn-install: copied $SRC -> $DEST"
fi

chmod +x "$SRC"

case ":$PATH:" in
  *":$DEST_DIR:"*) ;;
  *) echo "spawn-install: NOTE $DEST_DIR is not on your PATH. Add:"
     echo "                 export PATH=\"$DEST_DIR:\$PATH\"" ;;
esac

echo "spawn-install: done. Next: spawn doctor"
