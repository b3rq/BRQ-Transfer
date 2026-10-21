#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=12)?0:1)" || { echo 'Node >=22.12.0 required'; exit 1; }
BRQ_OPEN_BROWSER=1 node server.js
