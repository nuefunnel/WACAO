#!/usr/bin/env bash
# One-shot wrapper to regenerate assets/og-image.jpg with the real brand fonts.
#
# Downloads Baloo 2 + Plus Jakarta Sans (if missing), points fontconfig at them
# without installing system-wide, converts the logo to PNG, then runs the
# generator. Requires: curl, node, rsvg-convert, sips (macOS).
#
#   bash scripts/generate-og-image.sh
#
set -euo pipefail
# Scripts live at repo-root scripts/; cd to the repo root so paths below reach
# both website/ (assets) and scripts/ (the generator).
cd "$(dirname "$0")/.."

FONTDIR=/tmp/wacao-fonts
mkdir -p "$FONTDIR/cache"

[ -f "$FONTDIR/Baloo2.ttf" ] || curl -sL -o "$FONTDIR/Baloo2.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/baloo2/Baloo2%5Bwght%5D.ttf"
[ -f "$FONTDIR/PlusJakartaSans.ttf" ] || curl -sL -o "$FONTDIR/PlusJakartaSans.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf"

cat > "$FONTDIR/fonts.conf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>$FONTDIR</dir>
  <dir>/System/Library/Fonts</dir>
  <dir>/Library/Fonts</dir>
  <cachedir>$FONTDIR/cache</cachedir>
</fontconfig>
EOF

export FONTCONFIG_FILE="$FONTDIR/fonts.conf"
fc-cache -f "$FONTDIR" >/dev/null 2>&1

sips -s format png website/assets/wacao-logo.webp --out /tmp/wacao-logo.png >/dev/null
node scripts/generate-og-image.mjs
