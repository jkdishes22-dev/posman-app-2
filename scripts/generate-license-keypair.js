#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const outDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.cwd(), "build", "licenses");

fs.mkdirSync(outDir, { recursive: true });

const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519", {
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const privatePath = path.join(outDir, "license-private.pem");
const publicPath = path.join(outDir, "license-public.pem");

fs.writeFileSync(privatePath, privateKey, "utf8");
fs.writeFileSync(publicPath, publicKey, "utf8");

console.log(`Private key: ${privatePath}`);
console.log(`Public key: ${publicPath}`);
console.log("Set LICENSE_PUBLIC_KEY env var in deployed app using the public key content.");
