# MotionWeave - Troubleshooting Guide

## App Crashes on Launch

If the app crashes immediately after build, follow these steps:

### Step 1: Check Metro Bundler

```bash
# Kill any existing Metro processes
killall node

# Clear Metro cache
npm start -- --reset-cache
```

### Step 2: Clean Build

```bash
# Clean iOS build
cd ios
xcodebuild clean
rm -rf build
rm -rf Pods
rm -rf ~/Library/Developer/Xcode/DerivedData/*
cd ..

# Reinstall pods
cd ios
pod deintegrate
pod install
cd ..
```

### Step 3: Clear Node Modules

```bash
# Remove node_modules and reinstall
rm -rf node_modules
npm install

# Or with yarn
rm -rf node_modules
yarn install
```

### Step 4: Use Minimal App

If the app still crashes, use the minimal version:

```bash
# Backup current App.tsx
mv App.tsx App.full.tsx

# Use minimal version
mv App.minimal.tsx App.tsx

# Run app
npm run ios
```

If the minimal app works, the issue is with one of the services.

### Step 5: Check Native Dependencies

Some native dependencies need to be linked:

```bash
# Install pods
cd ios
pod install
cd ..

# Rebuild
npm run ios
```

### Step 6: Check Xcode Console

1. Open Xcode
2. Window → Devices and Simulators
3. Select your device/simulator
4. Click "Open Console"
5. Look for error messages

### Step 7: Common Issues

#### Issue: SQLite not working

**Solution**: SQLite might not be properly linked.

```bash
cd ios
pod install
cd ..
```

#### Issue: FFmpeg not working

**Solution**: FFmpeg Kit is large and might timeout.

```bash
# Increase timeout
cd ios
pod install --verbose
cd ..
```

#### Issue: Reanimated crash

**Solution**: Ensure babel plugin is configured.

Check `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin', // Must be last
  ],
};
```

#### Issue: Gesture Handler crash

**Solution**: Ensure GestureHandlerRootView wraps app.

Check `App.tsx`:

```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Your app */}
    </GestureHandlerRootView>
  );
}
```

#### Issue: RevenueCat crash

**Solution**: RevenueCat needs API keys. Comment out for now.

In `src/processes/iap/PurchaseService.ts`:

```typescript
static async initialize(): Promise<void> {
  // Comment out for testing
  // Purchases.configure({ apiKey });
  console.log('RevenueCat skipped for testing');
}
```

### Step 8: Disable Services Temporarily

Edit `src/app/providers/AppInitializer.tsx` to skip problematic services:

```typescript
const initializeApp = async () => {
  try {
    console.log('Initializing MotionWeave...');

    // Comment out problematic services
    // await DatabaseService.initialize();
    // await VideoImportService.initialize();
    // await FFmpegService.initialize();

    setIsInitialized(true);
    console.log('✓ App initialization complete');
  } catch (err) {
    console.error('Failed to initialize app:', err);
    setIsInitialized(true); // Continue anyway
  }
};
```

### Step 9: Check iOS Permissions

Ensure `ios/MotionWeave/Info.plist` has required permissions:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>MotionWeave needs access to your photos to import videos.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>MotionWeave needs permission to save videos.</string>
```

### Step 10: Reset Simulator

```bash
# Reset iOS simulator
xcrun simctl erase all

# Or reset specific simulator
xcrun simctl erase "iPhone 15 Pro"
```

## Debugging Commands

### View Logs

```bash
# iOS logs
npx react-native log-ios

# Android logs
npx react-native log-android
```

### Check Bundle

```bash
# Check if bundle is being created
ls ios/build/Build/Products/Debug-iphonesimulator/MotionWeave.app/main.jsbundle
```

### Verify Dependencies

```bash
# Check if all dependencies are installed
npm list

# Check for peer dependency issues
npm list --depth=0
```

## Quick Fix Script

Create a file `fix-app.sh`:

```bash
#!/bin/bash

echo "🔧 Fixing MotionWeave..."

# Kill Metro
echo "Killing Metro..."
killall node 2>/dev/null

# Clean
echo "Cleaning..."
rm -rf node_modules
rm -rf ios/Pods
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Install
echo "Installing dependencies..."
npm install

# Install pods
echo "Installing pods..."
cd ios
pod install
cd ..

# Clear cache
echo "Clearing cache..."
npm start -- --reset-cache &
sleep 5
killall node

echo "✅ Done! Try running: npm run ios"
```

Run it:

```bash
chmod +x fix-app.sh
./fix-app.sh
```

## Still Not Working?

### Option 1: Use Minimal App

The minimal app (`App.minimal.tsx`) has no dependencies and should always work.

### Option 2: Gradual Feature Addition

1. Start with minimal app
2. Add navigation
3. Add one screen at a time
4. Add services one by one
5. Identify which component causes crash

### Option 3: Check React Native Version

```bash
# Check React Native version
npx react-native --version

# Upgrade if needed
npx react-native upgrade
```

## Getting Help

If none of these work:

1. **Check Console**: Look at Xcode console for exact error
2. **Check Logs**: Run `npx react-native log-ios`
3. **Check GitHub Issues**: Search for similar issues
4. **Stack Overflow**: Search for error message
5. **React Native Community**: Ask in Discord/Forums

## Common Error Messages

### "Unable to resolve module"

**Solution**: Clear cache and reinstall

```bash
npm start -- --reset-cache
rm -rf node_modules && npm install
```

### "Command PhaseScriptExecution failed"

**Solution**: Clean and rebuild

```bash
cd ios
xcodebuild clean
pod install
cd ..
npm run ios
```

### "No bundle URL present"

**Solution**: Metro not running

```bash
npm start
# In new terminal
npm run ios
```

### "Invariant Violation"

**Solution**: Usually a component error. Check console for details.

## Prevention

To avoid crashes in the future:

1. **Test incrementally**: Test after each major change
2. **Use TypeScript**: Catch errors at compile time
3. **Check diagnostics**: Run `getDiagnostics` regularly
4. **Keep dependencies updated**: But test after updates
5. **Use error boundaries**: Catch React errors gracefully

---

**Need more help?** Check the error message in Xcode console and search for it online.
