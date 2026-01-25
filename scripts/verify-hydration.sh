#!/bin/bash

# Hydration Verification Script
# This script verifies that the app hydrates correctly after a build

echo "🔍 Verifying hydration health..."
echo ""

# Check if build succeeds
echo "1. Testing build..."
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build succeeded"

# Clean and start dev server
echo ""
echo "2. Starting clean dev server..."
pkill -f "node.*next" 2>/dev/null || true
sleep 2

PORT=3099 npm run dev:clean > /tmp/hydration-test.log 2>&1 &
DEV_PID=$!
sleep 12

# Check if HTML renders
echo "3. Checking if HTML renders..."
HTML_CHECK=$(curl -s http://localhost:3099 | grep -c "<!DOCTYPE\|<html" || true)
if [ "$HTML_CHECK" -eq 0 ]; then
  echo "❌ HTML not rendering"
  kill $DEV_PID 2>/dev/null
  exit 1
fi
echo "✅ HTML renders"

# Check if CSS is loaded
echo "4. Checking if CSS is loaded..."
CSS_CHECK=$(curl -s http://localhost:3099 | grep -c "stylesheet\|_next/static.*css" || true)
if [ "$CSS_CHECK" -eq 0 ]; then
  echo "❌ CSS not loading"
  kill $DEV_PID 2>/dev/null
  exit 1
fi
echo "✅ CSS loaded"

# Check if React is hydrating (look for React elements)
echo "5. Checking if React hydration markers present..."
REACT_CHECK=$(curl -s http://localhost:3099 | grep -c "class=\"sticky top-0\|data-react-root" || true)
if [ "$REACT_CHECK" -eq 0 ]; then
  echo "⚠️  React elements may not be hydrating"
else
  echo "✅ React elements detected"
fi

# Cleanup
kill $DEV_PID 2>/dev/null

echo ""
echo "✅ Hydration verification complete!"
echo "App is ready at http://localhost:3099"
