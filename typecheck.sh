#!/bin/bash

# Typecheck script for Effect v4 migration
# Run this to check all TypeScript types match up

echo "🔍 Running TypeScript type checking..."
echo ""

pnpm run check

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All types check successfully!"
    exit 0
else
    echo ""
    echo "❌ Type errors found. See above for details."
    echo ""
    echo "Files with errors:"
    pnpm run check 2>&1 | grep "error TS" | cut -d'(' -f1 | sort -u
    exit 1
fi
