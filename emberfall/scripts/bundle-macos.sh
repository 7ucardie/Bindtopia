#!/usr/bin/env bash
# Build a double-clickable Emberfall.app for the Mac you run this on (Apple Silicon or Intel).
# Run on macOS:  ./scripts/bundle-macos.sh      ->  target/release/Emberfall.app
set -euo pipefail
cd "$(dirname "$0")/.."

cargo build --release

APP="target/release/Emberfall.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp target/release/emberfall "$APP/Contents/MacOS/Emberfall"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Emberfall</string>
  <key>CFBundleDisplayName</key><string>Emberfall</string>
  <key>CFBundleIdentifier</key><string>dev.emberfall.game</string>
  <key>CFBundleExecutable</key><string>Emberfall</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>LSApplicationCategoryType</key><string>public.app-category.role-playing-games</string>
</dict>
</plist>
PLIST

echo "Built $APP"
echo "The app is not code-signed. First launch: right-click it in Finder, choose Open, then confirm."
