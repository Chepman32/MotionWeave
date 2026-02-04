# MotionWeave - Quick Start Guide

## Prerequisites

- macOS with Xcode installed
- Node.js >= 20
- CocoaPods installed
- iOS Simulator or physical iOS device

## Installation

1. **Clone and Install Dependencies**

   ```bash
   npm install
   ```

2. **Install iOS Pods**

   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Start Metro Bundler**

   ```bash
   npm start
   ```

4. **Run on iOS** (in a new terminal)
   ```bash
   npm run ios
   ```

## Project Structure

```
MotionWeave/
├── src/
│   ├── app/
│   │   └── navigation/          # App navigation
│   ├── features/
│   │   ├── splash/              # Splash screen
│   │   ├── onboarding/          # Onboarding flow
│   │   ├── home/                # Home screen
│   │   ├── templates/           # Templates screen
│   │   ├── editor/              # Video editor
│   │   ├── preview/             # Video preview
│   │   └── settings/            # Settings screen
│   ├── shared/
│   │   ├── components/          # Reusable components
│   │   ├── hooks/               # Custom hooks
│   │   ├── utils/               # Utility functions
│   │   ├── constants/           # Constants & theme
│   │   └── types/               # TypeScript types
│   └── entities/
│       └── project/             # Project logic
├── ios/                         # iOS native code
├── android/                     # Android native code (future)
└── App.tsx                      # App entry point
```

## Key Features Implemented

### ✅ Screens

- **Splash Screen**: Animated logo with gradient background
- **Onboarding**: Swipeable intro screens with skip option
- **Home Screen**: Project grid with FAB and bottom navigation
- **Templates Screen**: Pre-built layouts with category filters
- **Editor Screen**: Grid canvas with timeline and tools drawer
- **Preview Screen**: Full-screen video preview with controls
- **Settings Screen**: App preferences and export settings

### ✅ Components

- **CustomButton**: Animated button with variants
- **BottomSheet**: Draggable sheet with snap points
- **Toast**: Notification toasts with animations

### ✅ Features

- Theme support (light/dark)
- Gesture-based interactions
- Smooth animations (60fps)
- State management with Zustand
- TypeScript throughout

## Testing the App

1. **Launch the app** - You'll see the animated splash screen
2. **Onboarding** - Swipe through or skip the intro screens
3. **Home Screen** - View the empty state
4. **Tap FAB (+)** - Navigate to the editor
5. **Templates** - Tap the templates icon to browse layouts
6. **Editor** - Select cells and explore the tools drawer
7. **Settings** - Access app preferences

## Current Limitations

The following features are **not yet implemented**:

- ❌ Video import from gallery
- ❌ Video playback
- ❌ Video export
- ❌ Actual video processing (FFmpeg)
- ❌ Database persistence (SQLite)
- ❌ File system operations
- ❌ In-app purchases
- ❌ Haptic feedback
- ❌ Sound effects

These are **UI/UX prototypes** demonstrating the app flow and animations.

## Next Development Steps

1. **Video Import**

   - Install `react-native-image-picker`
   - Implement gallery access
   - Handle video selection

2. **Storage**

   - Set up SQLite database
   - Implement project CRUD
   - Add file system management

3. **Video Processing**

   - Install `ffmpeg-kit-react-native`
   - Implement video trimming
   - Implement video composition

4. **Export**
   - Implement FFmpeg-based export
   - Add progress tracking
   - Save to Photos library

See `IMPLEMENTATION_GUIDE.md` for detailed implementation instructions.

## Troubleshooting

### Metro bundler won't start

```bash
npm start -- --reset-cache
```

### iOS build fails

```bash
cd ios
pod install
cd ..
npm run ios
```

### Reanimated not working

- Check `babel.config.js` has the Reanimated plugin
- Restart Metro with cache reset

### Gesture Handler issues

- Ensure `GestureHandlerRootView` wraps the app in `App.tsx`
- Check that gesture-handler is properly linked

## Development Tips

1. **Hot Reload**: Press `r` in Metro terminal to reload
2. **Debug Menu**: Shake device or press `Cmd+D` in simulator
3. **Element Inspector**: Press `Cmd+D` → "Show Element Inspector"
4. **Performance Monitor**: Press `Cmd+D` → "Show Perf Monitor"

## Code Style

- TypeScript strict mode enabled
- ESLint configured
- Prettier for formatting
- Run `npm run lint` to check code

## Resources

- [React Native Docs](https://reactnative.dev/)
- [Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [Gesture Handler Docs](https://docs.swmansion.com/react-native-gesture-handler/)
- [Skia Docs](https://shopify.github.io/react-native-skia/)

## Support

For issues or questions:

1. Check `IMPLEMENTATION_GUIDE.md`
2. Review the design document
3. Check component documentation in code
4. Search React Native community forums

---

**Happy Coding! 🚀**
