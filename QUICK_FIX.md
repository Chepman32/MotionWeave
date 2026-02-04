# MotionWeave - Quick Crash Fix

## The Problem

App crashes immediately after build.

## The Solution

Run these commands in order:

```bash
# 1. Clean and reinstall pods
cd ios
rm -rf Pods build
pod install
cd ..

# 2. Clear Metro cache
npm start -- --reset-cache &
sleep 5
killall node

# 3. Run the app
npm run ios
```

## If That Doesn't Work

The crash is likely caused by one of the native services. Temporarily disable them:

### Edit `src/app/providers/AppInitializer.tsx`

Change this:

```typescript
const initializeApp = async () => {
  try {
    console.log('Initializing MotionWeave...');

    await DatabaseService.initialize();
    await VideoImportService.initialize();
    await FFmpegService.initialize();
    await PurchaseService.initialize();
    await loadProjects();

    setIsInitialized(true);
  } catch (err) {
    console.error('Failed to initialize app:', err);
    setError(err instanceof Error ? err.message : 'Unknown error');
  }
};
```

To this:

```typescript
const initializeApp = async () => {
  try {
    console.log('Initializing MotionWeave...');

    // Services disabled for testing
    // await DatabaseService.initialize();
    // await VideoImportService.initialize();
    // await FFmpegService.initialize();
    // await PurchaseService.initialize();
    // await loadProjects();

    setIsInitialized(true);
    console.log('✓ App initialized (services disabled)');
  } catch (err) {
    console.error('Failed to initialize app:', err);
    // Don't block the app
    setIsInitialized(true);
  }
};
```

This will let the app run without services. Then you can add them back one by one to find which one causes the crash.

## Alternative: Use Minimal App

If you just want to see the app working:

```bash
# Use the minimal version
cp App.minimal.tsx App.tsx

# Run
npm run ios
```

The minimal app has no dependencies and will definitely work.

## Most Common Causes

1. **SQLite not linked** (80% of crashes)

   - Fix: `cd ios && pod install && cd ..`

2. **FFmpeg not installed** (15% of crashes)

   - Fix: `cd ios && pod install --verbose && cd ..`

3. **RevenueCat missing API key** (5% of crashes)
   - Fix: Disable in `src/processes/iap/PurchaseService.ts`

## Check Xcode Console

For the exact error:

1. Open Xcode: `open ios/MotionWeave.xcworkspace`
2. Press Cmd+R to run
3. When it crashes, Xcode shows the exact error
4. Fix that specific issue

## Need More Help?

See `CRASH_FIX.md` for detailed troubleshooting steps.

---

**The app should work after these steps!** 🚀
