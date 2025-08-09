# App Downloads

This folder contains downloadable app files.

## File Structure:
- `android/` - Android APK files
- `ios/` - iOS app files (IPA for TestFlight)
- `web/` - Web app files (if needed)

## How to Upload Your Apps:

### For Android APK:
1. Build your React Native app: `cd McDonaldApp && expo build:android`
2. Place the generated APK file in `public/downloads/android/`
3. Name it something like `McDonald-App-v1.0.0.apk`

### For iOS:
1. Build your React Native app: `cd McDonaldApp && expo build:ios`
2. Place the generated IPA file in `public/downloads/ios/`
3. Name it something like `McDonald-App-v1.0.0.ipa`

### For Web App:
1. Build your Next.js app: `npm run build`
2. The web app can be accessed directly via the website
3. Optionally create a Progressive Web App (PWA) installer
