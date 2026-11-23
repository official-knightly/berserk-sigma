# Security policy

Chess Topper's Android package is built with Capacitor and embeds the production client bundle. The desktop package uses a Tauri shell to open the HTTPS-hosted application.

## Security controls
- Android's network cleartext traffic is disabled.
- Mixed-content loading is disabled.
- The Android build requests no broad storage, contacts, location, or microphone permissions.
- The desktop shell has a restrictive Content Security Policy and does not register custom native commands or plugins for remote content.
- Third-party links should open in the system browser.

The Android debug APK is for testing. For public distribution, use a maintainer-controlled release key and Google Play App Signing. Never commit signing keys or passwords to the repository.

Report vulnerabilities privately to the repository maintainer rather than posting exploit details in a public issue.
