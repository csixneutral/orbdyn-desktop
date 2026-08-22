#!/bin/bash
# Builds a proper Orbdyn.app / .dmg for this Mac.
# Run this once on your Mac and you get an installer you can keep and reuse.
cd "$(dirname "$0")"

echo ""
echo "  Building the Orbdyn installer for macOS..."
echo "  This takes a few minutes the first time."
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "  Please install Node.js first from https://nodejs.org (the green LTS button)."
  read -r -p "  Press Enter to close."
  exit 1
fi

npm install || { read -r -p "  Setup failed. Press Enter to close."; exit 1; }
npx electron-builder --mac dmg || { read -r -p "  Build failed. Press Enter to close."; exit 1; }

echo ""
echo "  Done. Look inside the 'dist' folder next to this file."
echo "  Open the .dmg and drag Orbdyn into your Applications folder."
echo ""
read -r -p "  Press Enter to close."
