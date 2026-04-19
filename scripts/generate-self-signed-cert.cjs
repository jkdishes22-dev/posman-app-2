#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Generates a self-signed code-signing certificate for Windows (.pfx).
 *
 * What this produces:
 *   build/signing/cert.pfx  — PKCS#12 bundle (cert + private key), used by electron-builder
 *
 * What self-signed means:
 *   Windows will still show a SmartScreen warning, but it will display "JK PosMan"
 *   as the publisher instead of "Unknown Publisher". Customers installing on-site
 *   can approve it once; subsequent runs are trusted.
 *
 * To replace with a paid CA certificate later:
 *   Simply swap build/signing/cert.pfx with the one from your CA.
 *   No other code changes needed.
 *
 * Usage:
 *   node scripts/generate-self-signed-cert.cjs
 *   node scripts/generate-self-signed-cert.cjs --password mypassword
 *
 * Requires: openssl in PATH (comes with macOS/Linux; install Git for Windows on Windows)
 */

const { execSync } = require("child_process");
const { existsSync, mkdirSync, rmSync } = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const signingDir = path.join(root, "build", "signing");
const pfxPath = path.join(signingDir, "cert.pfx");
const keyPath = path.join(signingDir, "cert.key.pem");
const certPath = path.join(signingDir, "cert.pem");

// Read password from CLI arg or use default
const passwordArg = process.argv.indexOf("--password");
const CERT_PASSWORD = passwordArg !== -1
  ? process.argv[passwordArg + 1]
  : "jkposman-dev-cert";

const SUBJECT = "/CN=JK PosMan/O=JK PosMan/C=KE/ST=Nairobi/L=Nairobi";
const DAYS = 3650; // 10 years

console.log("🔐 Generating self-signed code-signing certificate...");
console.log(`   Output:   ${pfxPath}`);
console.log(`   Subject:  ${SUBJECT}`);
console.log(`   Valid for: ${DAYS} days (~10 years)`);
console.log(`   Password: ${CERT_PASSWORD}\n`);
console.log("   ⚠️  This is a self-signed cert. Windows SmartScreen will still warn,");
console.log('      but will show "JK PosMan" as the publisher.\n');

mkdirSync(signingDir, { recursive: true });

try {
  // Step 1: Generate private key + self-signed cert (PEM format)
  execSync(
    `openssl req -x509 -newkey rsa:4096 -sha256 -days ${DAYS} -nodes ` +
    `-keyout "${keyPath}" -out "${certPath}" ` +
    `-subj "${SUBJECT}" ` +
    `-addext "extendedKeyUsage=codeSigning"`,
    { stdio: "pipe" }
  );
  console.log("   ✅ Private key and certificate generated");

  // Step 2: Bundle into PKCS#12 (.pfx) format that electron-builder expects
  execSync(
    `openssl pkcs12 -export ` +
    `-out "${pfxPath}" ` +
    `-inkey "${keyPath}" ` +
    `-in "${certPath}" ` +
    `-password pass:${CERT_PASSWORD}`,
    { stdio: "pipe" }
  );
  console.log("   ✅ PFX bundle created");

  // Step 3: Clean up intermediate PEM files (keep only the .pfx)
  rmSync(keyPath, { force: true });
  rmSync(certPath, { force: true });
  console.log("   ✅ Intermediate PEM files removed");

  console.log(`\n✅ Done! Certificate saved to: ${pfxPath}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Set CERT_PASSWORD=${CERT_PASSWORD} in your environment or CI secrets`);
  console.log(`   2. Run: npm run electron:build:win`);
  console.log(`   3. The installer will be signed with this certificate`);
  console.log(`\n   To upgrade to a paid CA certificate later:`);
  console.log(`   Replace build/signing/cert.pfx with the one from your CA.`);
} catch (error) {
  console.error("❌ Failed to generate certificate:", error.message);
  // Clean up on failure
  [keyPath, certPath].forEach(f => { try { rmSync(f, { force: true }); } catch {} });
  process.exit(1);
}
