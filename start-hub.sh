#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "=================================================="
echo "  🚀 Starting UnityDrop Hub & Wireless ADB..."
echo "=================================================="

if command -v xdg-open > /dev/null; then
  xdg-open http://localhost:4500 &
elif command -v open > /dev/null; then
  open http://localhost:4500 &
fi

node server.js