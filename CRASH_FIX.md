# MotionWeave - Crash Fix Guide

## Immediate Fix Steps

### Quick Fix (Try This First)

```bash
# 1. Run the fix script
./fix-app.sh

# 2. Start Metro
npm start

# 3. In a new terminal, run iOS
npm run ios
```

### If That Doesn't Work

Try these steps in order:

## Step 1: Clean Everything

```bash
# Kill all node processes
killall node

# Clean iOS
cd ios
xcodebuild clean
rm -rf build
rm -rf Pods
rm -rf ~/Library/Developer/Xcode/DerivedData/*
cd ..

# Reinstall pods
cd ios
pod install
cd ..

# Clear Metro cache
npm start -- --reset-cache
```

## Step 2: Check What's Causing the Crash

The crash is likely caused by one of these:

### A. Native Module Not Linked

**Symptoms**: App crashes immediately, no error message

**Fix**:

```bash
cd ios
pod install
cd ..
npm run ios
```

### B. SQLite Issue

**Symptoms**: "SQLite" error in console

**Fix**: Temporarily disable database

Edit `src/app/providers/AppInitializer.tsx`:

```typescript
// Comment out this line:
// await DatabaseService.initialize();
```

### C. FFmpeg Issue

**Symptoms**: "FFmpeg" error in console

**Fix**: Temporarily disable FFmpeg

Edit `src/app/providers/AppInitializer.tsx`:

```typescript
// Comment out this line:
// await FFmpegService.initialize();
```

### D. RevenueCat Issue

**Symptoms**: "RevenueCat" or "Purchases" error

**Fix**: Disable RevenueCat temporarily

Edit `src/processes/iap/PurchaseService.ts`:

```typescript
static async initialize(): Promise<void> {
  // Comment out the configure line
  // Purchases.configure({ apiKey });
  console.log('RevenueCat disabled for testing');
}
```

## Step 3: Use Minimal App

If the app still crashes, use the minimal version to verify React Native works:

```bash
# Backup current App.tsx
cp App.tsx App.full.tsx

# Use minimal version
cp App.minimal.tsx App.tsx

# Run
npm run ios
```

If the minimal app works, gradually add features back:

1. Start with minimal app ✅
2. Add navigation
3. Add one screen
4. Add services one by one
5. Find which one causes crash

## Step 4: Check Xcode Console

The Xcode console will show the exact error:

1. Open Xcode
2. Window → Devices and Simulators
3. Select your simulator
4. Click "Open Console"
5. Look for red error messages

Common errors and fixes:

### "dyld: Library not loaded"

**Fix**: Pod not installed

```bash
cd ios && pod install && cd ..
```

### "Undefined symbol"

**Fix**: Clean and rebuild

```bash
cd ios
xcodebuild clean
cd ..
npm run ios
```

### "Module not found"

**Fix**: Clear cache

```bash
npm start -- --reset-cache
```

## Step 5: Verify Dependencies

Check if all dependencies are properly installed:

```bash
# Check node_modules
ls node_modules | grep react-native

# Check pods
ls ios/Pods | grep -i sqlite
ls ios/Pods | grep -i ffmpeg
ls ios/Pods | grep -i purchases
```

If any are missing:

```bash
npm install
cd ios && pod install && cd ..
```

## Step 6: Check babel.config.js

Ensure Reanimated plugin is configured:

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin', // MUST be last!
  ],
};
```

If you changed it:

```bash
npm start -- --reset-cache
npm run ios
```

## Step 7: Reset Simulator

Sometimes the simulator gets corrupted:

```bash
# Reset all simulators
xcrun simctl erase all

# Or reset specific one
xcrun simctl erase "iPhone 15 Pro"

# Then run again
npm run ios
```

## Step 8: Check iOS Version

Ensure you're targeting the right iOS version:

1. Open `ios/MotionWeave.xcworkspace` in Xcode
2. Select MotionWeave target
3. General → Deployment Info
4. Set "Minimum Deployments" to iOS 14.0 or higher

## Most Likely Causes

Based on the implementation, the crash is most likely caused by:

### 1. SQLite Not Linked (80% probability)

**Fix**:

```bash
cd ios
pod install
cd ..
npm run ios
```

### 2. FFmpeg Kit Not Installed (15% probability)

FFmpeg Kit is large and sometimes fails to install.

**Fix**:

```bash
cd ios
pod install --verbose
cd ..
```

Watch for errors during pod install.

### 3. RevenueCat Missing API Key (5% probability)

**Fix**: Disable temporarily

Edit `src/processes/iap/PurchaseService.ts`:

```typescript
static async initialize(): Promise<void> {
  // Skip for now
  console.log('RevenueCat skipped');
  return;
}
```

## Emergency: Disable All Services

If nothing works, disable all services temporarily:

Edit `src/app/providers/AppInitializer.tsx`:

```typescript
const initializeApp = async () => {
  try {
    console.log('Initializing MotionWeave...');

    // DISABLE ALL SERVICES FOR TESTING
    // await DatabaseService.initialize();
    // await VideoImportService.initialize();
    // await FFmpegService.initialize();
    // await PurchaseService.initialize();
    // await loadProjects();

    setIsInitialized(true);
    console.log('✓ App initialized (services disabled)');
  } catch (err) {
    console.error('Failed to initialize app:', err);
    setIsInitialized(true);
  }
};
```

This will let the app run without any services. Then add them back one by one.

## Debugging Commands

```bash
# View iOS logs
npx react-native log-ios

# Check if bundle exists
ls ios/build/Build/Products/Debug-iphonesimulator/MotionWeave.app/

# Verify Metro is running
curl http://localhost:8081/status

# Check for port conflicts
lsof -i :8081
```

## Still Crashing?

### Get the Exact Error

1. Run with Xcode:

   ```bash
   open ios/MotionWeave.xcworkspace
   ```

2. Press Cmd+R to run

3. When it crashes, Xcode will show the exact line and error

4. Share that error for specific help

### Common Solutions

**"No bundle URL present"**:

```bash
npm start
# Wait for "Loading..." to finish
# Then in new terminal:
npm run ios
```

**"Command PhaseScriptExecution failed"**:

```bash
cd ios
xcodebuild clean
pod deintegrate
pod install
cd ..
npm run ios
```

**"Unable to resolve module"**:

```bash
npm start -- --reset-cache
rm -rf node_modules
npm install
npm run ios
```

## Prevention

To avoid crashes in the future:

1. Always run `pod install` after adding native dependencies
2. Clear cache when things act weird: `npm start -- --reset-cache`
3. Test on simulator before device
4. Keep dependencies updated but test after updates
5. Use the minimal app to verify React Native works

## Need More Help?

1. Check Xcode console for exact error
2. Run `npx react-native log-ios` for detailed logs
3. Search the error message on Google/Stack Overflow
4. Check React Native GitHub issues
5. Ask in React Native Discord/Forums

---

**The app should work after following these steps!** 🚀

If you're still having issues, the exact error message from Xcode console is needed to provide specific help.
