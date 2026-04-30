import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { licenseService } from "@backend/licensing/LicenseService";

const keytarStore = new Map<string, string>();

vi.mock("keytar", () => {
  const getPassword = vi.fn(async (service: string, account: string) => {
    return keytarStore.get(`${service}:${account}`) ?? null;
  });
  const setPassword = vi.fn(async (service: string, account: string, value: string) => {
    keytarStore.set(`${service}:${account}`, value);
  });
  return {
    default: {
      getPassword,
      setPassword,
    },
    getPassword,
    setPassword,
  };
});

function makeSignedCode(
  payload: Record<string, any>,
  privateKey: string,
): string {
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

describe("LicenseService", () => {
  let tempDir: string;
  let licensePath: string;
  let privateKey: string;
  let publicKey: string;

  beforeEach(() => {
    keytarStore.clear();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "posman-license-test-"));
    licensePath = path.join(tempDir, "license.dat");
    const keyPair = crypto.generateKeyPairSync("ed25519", {
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;

    (process.env as any).NODE_ENV = "test";
    process.env.LICENSE_ENFORCEMENT = "1";
    process.env.LICENSE_CERT_PATH = licensePath;
    process.env.LICENSE_PUBLIC_KEY = publicKey;
  });

  it("returns license_required when no stored certificate exists", async () => {
    const status = await licenseService.getStatus(true);
    expect(status.state).toBe("license_required");
    expect(status.code).toBe("LICENSE_REQUIRED");
  });

  it("activates and validates a signed trial license", async () => {
    const payload = {
      licenseId: crypto.randomUUID(),
      planType: "trial1m",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      machineBindingRequired: true,
      issuedAt: new Date().toISOString(),
    };

    const code = makeSignedCode(payload, privateKey);
    const activation = await licenseService.activateFromCode(code);
    expect(activation.state).toBe("ready");
    expect(activation.planType).toBe("trial1m");

    const status = await licenseService.getStatus(true);
    expect(status.state).toBe("ready");
    expect(status.code).toBe("LICENSE_READY");
  });

  it("rejects invalid signature", async () => {
    const otherPair = crypto.generateKeyPairSync("ed25519", {
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const payload = {
      licenseId: crypto.randomUUID(),
      planType: "trial1m",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      machineBindingRequired: true,
      issuedAt: new Date().toISOString(),
    };
    const code = makeSignedCode(payload, otherPair.privateKey);

    await expect(licenseService.activateFromCode(code)).rejects.toThrow(
      "License signature verification failed.",
    );
  });

  it("rejects expired trial license", async () => {
    const payload = {
      licenseId: crypto.randomUUID(),
      planType: "trial1m",
      expiresAt: new Date(Date.now() - 60000).toISOString(),
      machineBindingRequired: true,
      issuedAt: new Date().toISOString(),
    };
    const code = makeSignedCode(payload, privateKey);

    await expect(licenseService.activateFromCode(code)).rejects.toThrow("License has expired.");
  });

  it("returns license_invalid on machine binding mismatch", async () => {
    const payload = {
      licenseId: crypto.randomUUID(),
      planType: "trial1m",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      machineBindingRequired: true,
      issuedAt: new Date().toISOString(),
    };
    const code = makeSignedCode(payload, privateKey);

    await licenseService.activateFromCode(code);
    vi.spyOn(licenseService as any, "getMachineFingerprintHash").mockReturnValue(
      "different-machine-hash",
    );

    const status = await licenseService.getStatus(true);
    expect(status.state).toBe("license_invalid");
    expect(status.code).toBe("LICENSE_INVALID");
  });

  it("returns license_invalid when secure key storage access fails", async () => {
    fs.mkdirSync(path.dirname(licensePath), { recursive: true });
    fs.writeFileSync(
      licensePath,
      JSON.stringify({
        v: 1,
        iv: Buffer.alloc(12).toString("base64"),
        tag: Buffer.alloc(16).toString("base64"),
        data: Buffer.from("placeholder").toString("base64"),
      }),
      "utf8",
    );
    vi.spyOn(licenseService as any, "getOrCreateStorageKey").mockRejectedValue(
      new Error("keytar access failure"),
    );

    const status = await licenseService.getStatus(true);
    expect(status.state).toBe("license_invalid");
    expect(status.code).toBe("LICENSE_INVALID");
    expect(status.message).toContain("keytar access failure");
  });
});
