# Chess Topper for Android

Chess Topper is packaged as an Android application with Capacitor. The Android build embeds the production client bundle; it is not an Android shortcut that simply opens the public website.

## Build an installable debug APK

The GitHub Actions workflow **Chess Topper Android APK** builds the Android project and publishes the signed debug APK as the artifact `chess-topper-android-debug`.

1. Open the repository's **Actions** tab.
2. Select **Chess Topper Android APK** and run the workflow, or wait for it to finish after a push.
3. Open the successful run and download **chess-topper-android-debug**.
4. Extract the ZIP and install `app-debug.apk` on Android.

The debug APK is signed with the Android SDK's debug key so Android's package installer can verify its signature. It is intended for testing, not Play Store distribution.

## Android security and Play Protect

The build deliberately does not disable, evade, or hide from Android security checks. It uses a signed APK, disables cleartext HTTP traffic, trusts the system certificate store, disables Android backup for app data, and requests no broad storage or device permissions.

Android may still show an "install unknown apps" prompt or Play Protect warning for an APK installed outside Google Play. That is controlled by Android and cannot safely be removed by app code. For public distribution with the strongest user trust, publish an Android App Bundle through Google Play and use Play App Signing. A production signing key must be created and controlled by the app owner; never commit a keystore or passwords to GitHub.

## Game review engine

Game Review always uses the bundled Stockfish 19 Lite single-threaded WebAssembly worker for every imported PGN. Analysis is performed on-device. If Stockfish fails to initialize or analyse, the review shows an explicit error and does not present incomplete move grades as a completed report.

The Stockfish distribution is GPLv3. Keep the included licence, authorship notice, and corresponding-source information with every distributed build. See `public/engine/STOCKFISH-LICENSE.md`, `public/engine/stockfish-COPYING.txt`, and `public/engine/stockfish-AUTHORS.txt`.

## Local Android development

```bash
npm install
npm run build
npx cap add android
npx cap sync android
node scripts/harden-android.mjs
npx cap open android
```

Android builds require Android Studio / Android SDK and JDK 21. The CI workflow installs these build tools automatically.
