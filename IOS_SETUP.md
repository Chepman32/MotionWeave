# iOS Setup Guide for MotionWeave

## Prerequisites

- macOS (Monterey or later recommended)
- Xcode 14+ installed from App Store
- CocoaPods installed (`sudo gem install cocoapods`)
- Node.js 20+ installed
- iOS Simulator or physical iOS device

## Initial Setup

### 1. Install Dependencies

```bash
# Install npm packages
npm install

# Install iOS pods
cd ios
pod install
cd ..
```

### 2. Configure Xcode Project

1. Open `ios/MotionWeave.xcworkspace` in Xcode (NOT .xcodeproj)
2. Select the MotionWeave target
3. Go to "Signing & Capabilities"
4. Select your development team
5. Ensure bundle identifier is unique (e.g., `com.yourcompany.motionweave`)

### 3. Update Info.plist (Future - When Adding Video Features)

When you implement video import, add these permissions to `ios/MotionWeave/Info.plist`:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>MotionWeave needs access to your photos to import videos for your collages.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>MotionWeave needs permission to save your video collages to your photo library.</string>

<key>NSCameraUsageDescription</key>
<string>MotionWeave needs access to your camera to record videos.</string>

<key>NSMicrophoneUsageDescription</key>
<string>MotionWeave needs access to your microphone to record audio with videos.</string>
```

## Running the App

### Option 1: Using npm (Recommended)

```bash
# Start Metro bundler
npm start

# In a new terminal, run on iOS
npm run ios
```

### Option 2: Using Xcode

1. Open `ios/MotionWeave.xcworkspace` in Xcode
2. Select a simulator or connected device
3. Press Cmd+R to build and run

### Option 3: Specific Simulator

```bash
# List available simulators
xcrun simctl list devices

# Run on specific simulator
npm run ios -- --simulator="iPhone 15 Pro"
```

## Troubleshooting

### Issue: "Command PhaseScriptExecution failed"

**Solution**:

```bash
cd ios
pod deintegrate
pod install
cd ..
npm start -- --reset-cache
```

### Issue: "No bundle URL present"

**Solution**:

```bash
# Kill Metro bundler
killall node

# Clear cache and restart
npm start -- --reset-cache
```

### Issue: Reanimated not working

**Solution**:

1. Verify `babel.config.js` has `react-native-reanimated/plugin`
2. Clear cache: `npm start -- --reset-cache`
3. Rebuild: `npm run ios`

### Issue: Gesture Handler not responding

**Solution**:

1. Ensure `GestureHandlerRootView` wraps app in `App.tsx`
2. Check that gesture-handler is properly linked
3. Rebuild the app

### Issue: Skia rendering issues

**Solution**:

```bash
cd ios
pod update @shopify/react-native-skia
cd ..
npm run ios
```

### Issue: Build fails with "Multiple commands produce..."

**Solution**:

1. Open Xcode
2. File → Workspace Settings
3. Change "Build System" to "Legacy Build System"
4. Clean build folder (Cmd+Shift+K)
5. Build again (Cmd+B)

### Issue: "Unable to boot simulator"

**Solution**:

```bash
# Reset simulator
xcrun simctl erase all

# Or reset specific simulator
xcrun simctl erase "iPhone 15 Pro"
```

## Development Tips

### Hot Reload

- Press `r` in Metro terminal to reload
- Or shake device/press Cmd+D and select "Reload"

### Debug Menu

- Shake device or press Cmd+D in simulator
- Options:
  - Reload
  - Debug
  - Show Element Inspector
  - Show Performance Monitor

### Element Inspector

1. Press Cmd+D
2. Select "Show Element Inspector"
3. Tap any element to see its properties

### Performance Monitor

1. Press Cmd+D
2. Select "Show Perf Monitor"
3. Monitor FPS, memory, and JS thread

### Remote Debugging

1. Press Cmd+D
2. Select "Debug"
3. Opens Chrome DevTools
4. Use Console, Network, Sources tabs

## Building for Release

### 1. Update Version

Update version in:

- `package.json`
- `ios/MotionWeave/Info.plist` (CFBundleShortVersionString)

### 2. Configure Release Scheme

1. Open Xcode
2. Product → Scheme → Edit Scheme
3. Select "Release" for Run configuration

### 3. Archive

1. Product → Archive
2. Wait for archive to complete
3. Organizer window opens

### 4. Distribute

1. Select archive
2. Click "Distribute App"
3. Choose distribution method:
   - App Store Connect
   - Ad Hoc
   - Enterprise
   - Development

## App Icons

### Required Sizes

Place icons in `ios/MotionWeave/Images.xcassets/AppIcon.appiconset/`:

- 20x20 @2x, @3x (iPhone Notification)
- 29x29 @2x, @3x (iPhone Settings)
- 40x40 @2x, @3x (iPhone Spotlight)
- 60x60 @2x, @3x (iPhone App)
- 1024x1024 (App Store)

### Generate Icons

Use a tool like:

- [AppIcon.co](https://appicon.co/)
- [MakeAppIcon](https://makeappicon.com/)
- Xcode Asset Catalog

## Launch Screen

### Current Setup

Launch screen is configured in `ios/MotionWeave/LaunchScreen.storyboard`

### Customization

1. Open `LaunchScreen.storyboard` in Xcode
2. Modify the UI elements
3. Add app logo or branding
4. Keep it simple (iOS guidelines)

## Code Signing

### Development

1. Xcode → Preferences → Accounts
2. Add your Apple ID
3. Download certificates
4. Select team in project settings

### Distribution

1. Create App ID in Apple Developer Portal
2. Create Distribution Certificate
3. Create Provisioning Profile
4. Configure in Xcode

## App Store Submission

### Prerequisites

- Apple Developer Program membership ($99/year)
- App Store Connect account
- App icons and screenshots
- App description and metadata

### Steps

1. Create app in App Store Connect
2. Fill in app information
3. Upload screenshots
4. Archive app in Xcode
5. Upload to App Store Connect
6. Submit for review

### Review Guidelines

- Follow [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Ensure all features work
- Provide test account if needed
- Include privacy policy

## Performance Optimization

### Build Settings

In Xcode, optimize for release:

1. Build Settings → Optimization Level → "Fastest, Smallest [-Os]"
2. Build Settings → Strip Debug Symbols → "Yes"
3. Build Settings → Dead Code Stripping → "Yes"

### Hermes Engine

Hermes is enabled by default in React Native 0.82+

Verify in `ios/Podfile`:

```ruby
:hermes_enabled => true
```

### Bundle Size

Check bundle size:

```bash
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios-release.bundle \
  --assets-dest ios-release-assets
```

## Testing on Physical Device

### Requirements

- iOS device with iOS 14+
- Lightning/USB-C cable
- Device registered in Apple Developer Portal

### Steps

1. Connect device via cable
2. Trust computer on device
3. Select device in Xcode
4. Build and run (Cmd+R)

### Wireless Debugging (iOS 15+)

1. Connect device via cable initially
2. Window → Devices and Simulators
3. Select device
4. Check "Connect via network"
5. Disconnect cable

## Continuous Integration

### Fastlane Setup (Future)

```bash
# Install Fastlane
sudo gem install fastlane

# Initialize
cd ios
fastlane init
```

### GitHub Actions (Future)

Create `.github/workflows/ios.yml` for automated builds

## Useful Commands

```bash
# Clean build
cd ios
xcodebuild clean
cd ..

# List schemes
xcodebuild -list -workspace ios/MotionWeave.xcworkspace

# Build for simulator
xcodebuild -workspace ios/MotionWeave.xcworkspace \
  -scheme MotionWeave \
  -sdk iphonesimulator \
  -configuration Debug

# Run tests
xcodebuild test -workspace ios/MotionWeave.xcworkspace \
  -scheme MotionWeave \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

## Resources

- [React Native iOS Setup](https://reactnative.dev/docs/environment-setup)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)
- [CocoaPods Guides](https://guides.cocoapods.org/)
- [App Store Connect Help](https://developer.apple.com/app-store-connect/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)

## Support

For iOS-specific issues:

1. Check Xcode console for errors
2. Review build logs
3. Check CocoaPods documentation
4. Search React Native GitHub issues
5. Ask on Stack Overflow with `react-native` and `ios` tags

---

**Ready to run on iOS! 📱**
