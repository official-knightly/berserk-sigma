# Security policy

Chess Topper uses a native Android WebView and Tauri desktop shell to open the HTTPS-hosted Chess Topper application.

## Security controls
- Android requests only the INTERNET permission.
- Cleartext HTTP traffic is disabled.
- Android WebView file and content access are disabled.
- Mixed content and third-party cookies are disabled.
- Android Safe Browsing is enabled where supported.
- Navigation is restricted to the configured HTTPS application host; other HTTPS links open in the system browser.
- The Android and desktop shells expose no JavaScript-to-native bridge.
- Desktop Content Security Policy limits resource origins to HTTPS and local application assets.

Report vulnerabilities privately to the repository maintainer rather than posting exploit details in a public issue.
