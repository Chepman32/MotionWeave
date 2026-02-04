#!/bin/bash

echo "🔧 Fixing MotionWeave..."

# Kill Metro
echo "Killing Metro..."
killall node 2>/dev/null || true

# Clean iOS
echo "Cleaning iOS build..."
cd ios
xcodebuild clean 2>/dev/null || true
rm -rf build
rm -rf Pods
cd ..

# Clean cache
echo "Cleaning cache..."
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true

# Install pods
echo "Installing pods..."
cd ios
pod install
cd ..

echo "✅ Done! Now run: npm run ios"
