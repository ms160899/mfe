#!/bin/bash

# Post-build script to organize federation chunks into versioned paths
# Run this after: npm run build

set -e

# Configuration
VERSION="${1:-v1.0.0}"
DIST_DIR="dist/browser"
MFE_DIR="$DIST_DIR/mfe/$VERSION"

echo "📦 Organizing federation chunks for version: $VERSION"

# Create versioned directory
mkdir -p "$MFE_DIR"

# Move remoteEntry.json
if [ -f "$DIST_DIR/remoteEntry.json" ]; then
  mv "$DIST_DIR/remoteEntry.json" "$MFE_DIR/remoteEntry.json"
  echo "✅ Moved remoteEntry.json to $MFE_DIR"
fi

# Move Web Component chunks
for file in "$DIST_DIR"/*-element-*.js; do
  if [ -f "$file" ]; then
    mv "$file" "$MFE_DIR/"
    echo "✅ Moved $(basename $file) to $MFE_DIR"
  fi
done

# Copy embed SDK to root (if not already there)
if [ -f "$DIST_DIR/embed-sdk.js" ]; then
  echo "✅ embed-sdk.js already in root"
fi

echo ""
echo "📍 Federation remote ready at: /$MFE_DIR/"
echo "📍 Components available at:"
echo "   - /$MFE_DIR/remoteEntry.json"
echo "   - /$MFE_DIR/date-picker-element-*.js"
echo "   - /$MFE_DIR/data-grid-element-*.js"
echo ""
echo "🚀 Ready to deploy!"
