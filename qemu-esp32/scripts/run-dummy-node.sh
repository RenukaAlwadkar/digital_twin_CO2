#!/usr/bin/env bash
set -euo pipefail

cd /workspace/qemu-esp32/firmware/dummy-node

idf.py set-target esp32
idf.py build

# If TAP setup is enabled in the container entrypoint, QEMU can use it.
# Fallback is built-in user networking if TAP is unavailable.
idf.py qemu monitor
