# MotionWeave - App Store Submission Guide

## Overview

This guide provides step-by-step instructions for preparing and submitting MotionWeave to the Apple App Store.

---

## Prerequisites

- [ ] Apple Developer Account ($99/year)
- [ ] Xcode 14+ installed
- [ ] App fully tested and production-ready
- [ ] All features working correctly
- [ ] No critical bugs

---

## Phase 1: App Configuration

### 1.1 Bundle Identifier

Update in Xcode:

1. Open `ios/MotionWeave.xcworkspace`
2. Select MotionWeave target
3. General → Identity
4. Set Bundle Identifier: `com.yourcompany.motionweave`

### 1.2 Version & Build Number

Update in `ios/MotionWeave/Info.plist`:

```xml
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
<key>CFBundleVersion</key>
<string>1</string>
```

### 1.3 App Icons

Required sizes (all in `ios/MotionWeave/Images.xcassets/AppIcon.appiconset/`):

- 20x20 @2x, @3x (iPhone Notification)
- 29x29 @2x, @3x (iPhone Settings)
- 40x40 @2x, @3x (iPhone Spotlight)
- 60x60 @2x, @3x (iPhone App)
- 1024x1024 (App Store)

**Design Guidelines**:

- Simple, recognizable design
- No transparency
- No rounded corners (iOS adds them)
- Use MotionWeave brand colors (purple/pink gradient)

**Tools**:

- [AppIcon.co](https://appicon.co/) - Generate all sizes
- [MakeAppIcon](https://makeappicon.com/) - Alternative generator

### 1.4 Launch Screen

Update `ios/MotionWeave/LaunchScreen.storyboard`:

- Match splash screen design
- Keep it simple (Apple guidelines)
- Use app logo or brand colors
- No text or promotional content

### 1.5 Permissions

Verify in `ios/MotionWeave/Info.plist`:

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

---

## Phase 2: App Store Connect Setup

### 2.1 Create App Listing

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: MotionWeave
   - Primary Language: English (US)
   - Bundle ID: com.yourcompany.motionweave
   - SKU: motionweave-ios-001

### 2.2 App Information

**Name**: MotionWeave

**Subtitle** (30 characters max):

```
Video Collage Creator
```

**Category**:

- Primary: Photo & Video
- Secondary: Productivity

**Content Rights**:

- [ ] Contains third-party content

**Age Rating**:

- 4+ (No objectionable content)

---

## Phase 3: App Description & Metadata

### 3.1 Description

```
Create stunning video collages with MotionWeave - the ultimate video editing app for iOS.

FEATURES:
• Multiple Layout Options - Choose from 10+ pre-built templates
• Professional Filters - Apply 7 beautiful filters with adjustable intensity
• Easy Video Import - Select videos directly from your Photo Library
• High-Quality Export - Export in up to 4K resolution
• Intuitive Timeline - Edit with precision using our interactive timeline
• Save to Photos - Seamlessly save your creations to your library
• Completely Offline - All processing happens on your device

PERFECT FOR:
• Social Media Content - Create engaging posts for Instagram, TikTok, YouTube
• Memories & Highlights - Combine special moments into one video
• Comparison Videos - Show before/after or side-by-side comparisons
• Creative Projects - Express your creativity with unique layouts

PREMIUM FEATURES:
• 20+ Exclusive Templates
• Advanced Filters & Effects
• Text Overlays with Custom Fonts
• 4K Export Quality
• Background Music Library
• No Watermark
• Priority Export
• Cloud Backup

MotionWeave is designed for creators who want professional results without the complexity. Whether you're a social media influencer, content creator, or just want to preserve memories in a unique way, MotionWeave makes it easy.

Download now and start creating amazing video collages!

---

Privacy Policy: [Your URL]
Terms of Service: [Your URL]
Support: support@motionweave.com
```

### 3.2 Keywords (100 characters max)

```
video,collage,editor,grid,split,screen,merge,combine,social,media,instagram,tiktok,youtube
```

### 3.3 Support URL

```
https://motionweave.com/support
```

### 3.4 Marketing URL (optional)

```
https://motionweave.com
```

### 3.5 Privacy Policy URL

```
https://motionweave.com/privacy
```

---

## Phase 4: Screenshots

### 4.1 Required Sizes

**6.5" Display** (iPhone 14 Pro Max, 15 Pro Max):

- 1290 x 2796 pixels
- 3-10 screenshots required

**5.5" Display** (iPhone 8 Plus):

- 1242 x 2208 pixels
- 3-10 screenshots required

### 4.2 Screenshot Content

**Screenshot 1: Home Screen**

- Show project grid with sample projects
- Highlight FAB button
- Caption: "Manage all your video projects in one place"

**Screenshot 2: Templates**

- Display template selection screen
- Show variety of layouts
- Caption: "Choose from 10+ professional templates"

**Screenshot 3: Editor**

- Show editor with videos in grid
- Highlight timeline
- Caption: "Intuitive editing with powerful timeline"

**Screenshot 4: Filters**

- Display filter panel with presets
- Show before/after comparison
- Caption: "Apply beautiful filters with one tap"

**Screenshot 5: Export**

- Show export modal with quality options
- Highlight 4K support
- Caption: "Export in stunning quality up to 4K"

**Screenshot 6: Premium**

- Display paywall with features
- Show pricing
- Caption: "Unlock all features with Premium"

### 4.3 Design Guidelines

- Use device frames
- Add captions/text overlays
- Show actual app interface
- Use consistent branding
- Highlight key features

**Tools**:

- [Previewed](https://previewed.app/) - Screenshot mockups
- [Screenshot Creator](https://www.screenshotcreator.com/) - Device frames

---

## Phase 5: App Preview Video

### 5.1 Specifications

- Duration: 15-30 seconds
- Resolution: 1080p or 4K
- Format: .mov or .mp4
- Orientation: Portrait
- No audio required (but recommended)

### 5.2 Content Structure

**0-5s**: App logo animation + tagline
**5-10s**: Quick feature showcase (import, arrange, filter)
**10-20s**: Show editing process
**20-25s**: Display export and final result
**25-30s**: Call to action + app icon

### 5.3 Best Practices

- Show actual app interface
- Keep it fast-paced
- Highlight unique features
- Add background music
- Include text overlays
- End with strong CTA

---

## Phase 6: Build & Upload

### 6.1 Archive Build

1. Open Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Wait for archive to complete
5. Organizer window opens automatically

### 6.2 Validate Archive

1. Select your archive
2. Click "Validate App"
3. Choose distribution method: "App Store Connect"
4. Select signing certificate
5. Wait for validation
6. Fix any errors/warnings

### 6.3 Upload to App Store Connect

1. Click "Distribute App"
2. Choose "App Store Connect"
3. Select "Upload"
4. Choose signing options
5. Review summary
6. Click "Upload"
7. Wait for processing (10-30 minutes)

---

## Phase 7: Submission

### 7.1 Build Selection

1. Go to App Store Connect
2. Select your app
3. Go to "App Store" tab
4. Click "+" to create new version
5. Enter version number: 1.0.0
6. Select uploaded build

### 7.2 Review Information

**Contact Information**:

- First Name: [Your Name]
- Last Name: [Your Name]
- Phone: [Your Phone]
- Email: [Your Email]

**Demo Account** (if needed):

- Username: demo@motionweave.com
- Password: DemoPass123!
- Notes: "Test account with sample projects"

**Notes for Review**:

```
Thank you for reviewing MotionWeave!

TESTING INSTRUCTIONS:
1. Grant Photo Library permissions when prompted
2. Tap the + button to create a new project
3. Select a template (e.g., Classic 2x2)
4. Tap "Add Videos" and select 4 videos from the library
5. Videos will appear in the grid
6. Tap a video to select it
7. Apply a filter from the Filters tab
8. Tap "Export" to process the video
9. Choose to save to Photo Library

PREMIUM FEATURES:
Premium features are locked behind a paywall. You can test the free features without purchasing.

If you have any questions, please contact: support@motionweave.com
```

### 7.3 Version Release

**Release Options**:

- [ ] Automatically release after approval
- [x] Manually release after approval (recommended for first version)

### 7.4 Submit for Review

1. Review all information
2. Check all required fields are filled
3. Click "Submit for Review"
4. Confirm submission

---

## Phase 8: Review Process

### 8.1 Timeline

- **In Review**: 24-48 hours typically
- **Processing**: Additional 24 hours after approval
- **Total**: 2-4 days average

### 8.2 Common Rejection Reasons

1. **Crashes**: App crashes during review

   - Solution: Test thoroughly, fix all bugs

2. **Missing Functionality**: Features don't work

   - Solution: Ensure all features are functional

3. **Permissions**: Unclear permission usage

   - Solution: Clear, specific permission descriptions

4. **Metadata**: Misleading screenshots/description

   - Solution: Accurate representation of app

5. **IAP Issues**: In-app purchases not working
   - Solution: Test IAP thoroughly in sandbox

### 8.3 If Rejected

1. Read rejection reason carefully
2. Fix the issues
3. Respond to reviewer if needed
4. Submit new build or resubmit
5. Wait for re-review

---

## Phase 9: Post-Approval

### 9.1 Release

1. Receive approval email
2. Go to App Store Connect
3. Click "Release This Version"
4. App goes live within 24 hours

### 9.2 Monitor

- Check App Store listing
- Monitor crash reports
- Read user reviews
- Track downloads/revenue

### 9.3 Updates

For future updates:

1. Increment version number
2. Create new build
3. Upload to App Store Connect
4. Submit for review
5. Repeat process

---

## Checklist

### Pre-Submission

- [ ] App fully tested on multiple devices
- [ ] All features working correctly
- [ ] No crashes or critical bugs
- [ ] Permissions properly configured
- [ ] App icons created (all sizes)
- [ ] Launch screen designed
- [ ] Bundle identifier set
- [ ] Version numbers updated

### App Store Connect

- [ ] App listing created
- [ ] Description written
- [ ] Keywords added
- [ ] Screenshots captured (6.5" and 5.5")
- [ ] App preview video created (optional)
- [ ] Support URL added
- [ ] Privacy policy URL added
- [ ] Category selected
- [ ] Age rating set

### Build & Upload

- [ ] Archive created in Xcode
- [ ] Build validated successfully
- [ ] Build uploaded to App Store Connect
- [ ] Build processed and available

### Review

- [ ] Build selected for version
- [ ] Review information filled
- [ ] Demo account provided (if needed)
- [ ] Notes for reviewer added
- [ ] Submitted for review

### Post-Approval

- [ ] App released to App Store
- [ ] Monitoring set up
- [ ] Support channels ready
- [ ] Marketing materials prepared

---

## Resources

### Apple Documentation

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

### Tools

- [App Store Connect](https://appstoreconnect.apple.com/)
- [TestFlight](https://developer.apple.com/testflight/) - Beta testing
- [App Analytics](https://developer.apple.com/app-store-connect/analytics/) - Track performance

### Support

- [Apple Developer Forums](https://developer.apple.com/forums/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/ios)

---

## Tips for Success

1. **Test Thoroughly**: Test on multiple devices and iOS versions
2. **Clear Description**: Be specific about features and functionality
3. **Quality Screenshots**: Use professional, clear screenshots
4. **Accurate Metadata**: Don't overpromise in description
5. **Respond Quickly**: If reviewer has questions, respond promptly
6. **Follow Guidelines**: Read and follow App Store Review Guidelines
7. **Be Patient**: Review process takes time, don't rush
8. **Plan Updates**: Have update roadmap ready

---

**Good luck with your App Store submission! 🚀**
