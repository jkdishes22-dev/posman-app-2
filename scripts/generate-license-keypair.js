#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

function resolvePath(inputPath) {
  if (!inputPath) return inputPath;
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith(`~${path.sep}`) || inputPath.startsWith("~/")) {
    return path.resolve(os.homedir(), inputPath.slice(2));
  }
  return path.resolve(inputPath);
}

const outDir = process.argv[2]
  ? resolvePath(process.argv[2])
  : path.join(process.cwd(), "build", "licenses");
const publicResourceDir = path.join(process.cwd(), "public", "license");
const publicResourcePath = path.join(publicResourceDir, "public-key.pem");

fs.mkdirSync(outDir, { recursive: true });

const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519", {
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const privatePath = path.join(outDir, "license-private.pem");
const publicPath = path.join(outDir, "license-public.pem");

fs.writeFileSync(privatePath, privateKey, "utf8");
fs.writeFileSync(publicPath, publicKey, "utf8");
fs.mkdirSync(publicResourceDir, { recursive: true });
fs.writeFileSync(publicResourcePath, publicKey, "utf8");

console.log(`Private key: ${privatePath}`);
console.log(`Public key: ${publicPath}`);
console.log(`Bundled public key resource: ${publicResourcePath}`);
console.log("Set LICENSE_PUBLIC_KEY env var only if installer/resource loading fails.");
