#!/bin/bash

echo "🎬 MotionWeave - Starting Application"
echo "======================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if iOS pods are installed
if [ ! -d "ios/Pods" ]; then
    echo "📱 Installing iOS pods..."
    cd ios
    pod install
    cd ..
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Starting Metro bundler..."
echo ""

# Start Metro in the background
npm start &
METRO_PID=$!

echo ""
echo "⏳ Waiting for Metro to start..."
sleep 5

echo ""
echo "📱 Building and running on iOS..."
echo ""

# Run on iOS
npm run ios

# Keep script running
wait $METRO_PID
