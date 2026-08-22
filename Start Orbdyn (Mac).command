#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "  ORBDYN"
echo "  ------"
echo ""

if ! command -v node >/dev/null 2>&1; then
  cat <<'MSG'
  Node.js is not installed on this Mac yet.

  Orbdyn needs it to run. It is free and takes about two minutes:
    1. Go to  https://nodejs.org
    2. Download the big green "LTS" button and install it
       (keep clicking Continue - the default answers are fine)
    3. Close this window and double-click this file again

MSG
  read -r -p "  Press Enter to close."
  exit 1
fi

if [ ! -d "node_modules/electron" ]; then
  echo "  First time setup. This downloads what Orbdyn needs - about 2-5 minutes."
  echo "  You only ever have to do this once. Please leave this window open."
  echo ""
  npm install || {
    echo ""
    echo "  Setup did not finish. Check your internet connection and try again."
    read -r -p "  Press Enter to close."
    exit 1
  }
fi

echo "  Starting Orbdyn..."
npm start
