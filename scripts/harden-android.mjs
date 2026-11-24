import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = await readFile(manifestPath, "utf8");

if (!manifest.includes("android:usesCleartextTraffic=")) {
  manifest = manifest.replace("<application", '<application android:usesCleartextTraffic="false"');
} else {
  manifest = manifest.replace(/android:usesCleartextTraffic="[^"]*"/, 'android:usesCleartextTraffic="false"');
}
if (!manifest.includes("android:networkSecurityConfig=")) {
  manifest = manifest.replace("<application", '<application android:networkSecurityConfig="@xml/network_security_config"');
}
if (!manifest.includes("android:allowBackup=")) {
  manifest = manifest.replace("<application", '<application android:allowBackup="false"');
}
await writeFile(manifestPath, manifest);

const securityPath = "android/app/src/main/res/xml/network_security_config.xml";
await mkdir(dirname(securityPath), { recursive: true });
await writeFile(securityPath, `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`);
console.log("Android manifest hardened: HTTPS-only network traffic; app backup disabled.");
