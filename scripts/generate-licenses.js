#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

function readArg(name, fallback = "") {
  const prefixed = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefixed));
  if (!match) return fallback;
  return match.slice(prefixed.length);
}

function stripWrappingQuotes(value) {
  if (!value) return value;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function asInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const count = asInt(readArg("count", "5"), 5);
const months = asInt(readArg("months", "1"), 1);
const version = readArg("version", "unknown-version");
const customerRef = readArg("customerRef", "unassigned");
const outputDir = readArg("out", path.join(process.cwd(), "build", "licenses"));
const includeLifetime = readArg("includeLifetime", "1") !== "0";
/** Optional basename (no path). Writes `<name>.json` under --out instead of licenses-<version>-<stamp>.json */
const outputName = readArg("name", "").trim();
const privateKeyPath = readArg("privateKey", "");

if (!privateKeyPath) {
  console.error("Missing --privateKey=/absolute/path/to/private.pem");
  process.exit(1);
}

function resolvePath(inputPath) {
  if (!inputPath) return inputPath;
  const normalized = stripWrappingQuotes(inputPath);
  if (normalized === "~") return os.homedir();
  if (/^~(?=$|[\\/])/.test(normalized)) {
    return path.resolve(os.homedir(), normalized.slice(2));
  }
  return path.resolve(normalized);
}

const resolvedPrivateKeyPath = resolvePath(privateKeyPath);
if (!fs.existsSync(resolvedPrivateKeyPath)) {
  console.error(`Private key file not found: ${resolvedPrivateKeyPath}`);
  console.error("Tip: On Windows, prefer an absolute path or quoted ~/path.");
  process.exit(1);
}
const privateKey = fs.readFileSync(resolvedPrivateKeyPath, "utf8");
const issuedAt = new Date();

function encodeCertificate(payload) {
  const payloadJson = JSON.stringify(payload);
  const signature = crypto.sign(null, Buffer.from(payloadJson, "utf8"), privateKey);
  return Buffer.from(
    JSON.stringify({
      payload,
      signature: signature.toString("base64"),
    }),
    "utf8",
  ).toString("base64");
}

function addMonths(date, monthCount) {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() + monthCount);
  return copy;
}

function generatePayload(planType, expiresAt) {
  return {
    licenseId: crypto.randomUUID(),
    planType,
    expiresAt,
    machineBindingRequired: true,
    issuedAt: issuedAt.toISOString(),
    customerRef,
    notes: `Generated for ${version}`,
  };
}

const trialLicenses = [];
for (let i = 0; i < count; i += 1) {
  const expiresAt = addMonths(issuedAt, months).toISOString();
  const payload = generatePayload("trial1m", expiresAt);
  trialLicenses.push({
    payload,
    code: encodeCertificate(payload),
  });
}

let lifetime = null;
if (includeLifetime) {
  const payload = generatePayload("lifetime", null);
  lifetime = {
    payload,
    code: encodeCertificate(payload),
  };
}

fs.mkdirSync(outputDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const baseFileName = outputName
  ? `${outputName.replace(/\.json$/i, "")}.json`
  : `licenses-${version}-${stamp}.json`;
const outFile = path.join(outputDir, baseFileName);
const ledger = {
  generatedAt: new Date().toISOString(),
  version,
  customerRef,
  trialLicenses,
  lifetimeLicense: lifetime,
};

fs.writeFileSync(outFile, JSON.stringify(ledger, null, 2), "utf8");
console.log(`License batch created: ${outFile}`);
