import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import {
  LicensePayload,
  LicenseValidationResult,
  SignedLicenseCertificate,
} from "./types";

type KeytarClient = {
  getPassword: (service: string, account: string) => Promise<string | null>;
  setPassword: (service: string, account: string, password: string) => Promise<void>;
};

const KEYTAR_SERVICE = "jk-posman-license";
const STORAGE_KEY_ACCOUNT = "license-storage-key";
const MACHINE_BINDING_ACCOUNT = "license-machine-binding";
const ENCRYPTION_ALGO = "aes-256-gcm";
const CACHE_TTL_MS = 10 * 60 * 1000;

type EncryptedLicenseBlob = {
  v: 1;
  iv: string;
  tag: string;
  data: string;
};

export class LicenseValidationError extends Error {
  readonly code: "LICENSE_REQUIRED" | "LICENSE_INVALID" | "LICENSE_EXPIRED";

  constructor(
    code: "LICENSE_REQUIRED" | "LICENSE_INVALID" | "LICENSE_EXPIRED",
    message: string,
  ) {
    super(message);
    this.name = "LicenseValidationError";
    this.code = code;
  }
}

class LicenseService {
  private cache: { at: number; result: LicenseValidationResult } | null = null;
  private keytarClient: KeytarClient | null = null;
  private warnedAboutKeytarFallback = false;

  private enforcementEnabled(): boolean {
    if (process.env.LICENSE_ENFORCEMENT === "0") return false;
    if (process.env.LICENSE_ENFORCEMENT === "1") return true;
    return process.env.NODE_ENV === "production";
  }

  private getPublicKey(): string | null {
    return process.env.LICENSE_PUBLIC_KEY || null;
  }

  private getLicenseFilePath(): string {
    if (process.env.LICENSE_CERT_PATH) {
      return process.env.LICENSE_CERT_PATH;
    }
    const sqlitePath = process.env.SQLITE_DB_PATH;
    if (sqlitePath) {
      return path.join(path.dirname(sqlitePath), "license.dat");
    }
    return path.join(process.cwd(), ".license", "license.dat");
  }

  private getFallbackSecretsFilePath(): string {
    return path.join(path.dirname(this.getLicenseFilePath()), "license.secrets.json");
  }

  private readFallbackSecrets(): Record<string, string> {
    const filePath = this.getFallbackSecretsFilePath();
    try {
      if (!fs.existsSync(filePath)) {
        return {};
      }
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeFallbackSecrets(data: Record<string, string>): void {
    const filePath = this.getFallbackSecretsFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data), { encoding: "utf8", mode: 0o600 });
  }

  private createFallbackKeytarClient(): KeytarClient {
    const keyFor = (service: string, account: string) => `${service}:${account}`;
    return {
      getPassword: async (service: string, account: string) => {
        const store = this.readFallbackSecrets();
        return store[keyFor(service, account)] ?? null;
      },
      setPassword: async (service: string, account: string, password: string) => {
        const store = this.readFallbackSecrets();
        store[keyFor(service, account)] = password;
        this.writeFallbackSecrets(store);
      },
    };
  }

  private async getKeytarClient(): Promise<KeytarClient> {
    if (this.keytarClient) {
      return this.keytarClient;
    }

    try {
      // Runtime-load keytar only on server execution path; avoid bundler resolving native .node in dev.
      const runtimeRequire = eval("require") as NodeRequire;
      const loaded = runtimeRequire("keytar") as any;
      const client = (loaded?.default || loaded) as KeytarClient;
      if (
        !client ||
        typeof client.getPassword !== "function" ||
        typeof client.setPassword !== "function"
      ) {
        throw new Error("keytar module loaded without expected API.");
      }
      this.keytarClient = client;
      return client;
    } catch (error: any) {
      if (!this.warnedAboutKeytarFallback) {
        this.warnedAboutKeytarFallback = true;
        console.warn(
          "[license] keytar unavailable; using local fallback secret storage.",
          {
            reason: error?.message || "keytar load failure",
            platform: process.platform,
            arch: process.arch,
            fallbackFile: this.getFallbackSecretsFilePath(),
          },
        );
      }
      const fallback = this.createFallbackKeytarClient();
      this.keytarClient = fallback;
      return fallback;
    }
  }

  private async getOrCreateStorageKey(): Promise<Buffer> {
    try {
      const keytarClient = await this.getKeytarClient();
      let key = await keytarClient.getPassword(KEYTAR_SERVICE, STORAGE_KEY_ACCOUNT);
      if (!key) {
        key = crypto.randomBytes(32).toString("base64");
        await keytarClient.setPassword(KEYTAR_SERVICE, STORAGE_KEY_ACCOUNT, key);
      }
      return Buffer.from(key, "base64");
    } catch (error: unknown) {
      if (error instanceof LicenseValidationError) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : "keytar access failure";
      throw new LicenseValidationError(
        "LICENSE_INVALID",
        `Secure license storage is unavailable (${msg}).`,
      );
    }
  }

  private getMachineFingerprintHash(): string {
    const raw = [
      os.platform(),
      os.arch(),
      os.hostname(),
      os.release(),
      os.userInfo().username,
    ].join("|");
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  private async getStoredMachineBinding(): Promise<string | null> {
    try {
      const keytarClient = await this.getKeytarClient();
      return await keytarClient.getPassword(
        KEYTAR_SERVICE,
        MACHINE_BINDING_ACCOUNT,
      );
    } catch (error: unknown) {
      if (error instanceof LicenseValidationError) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : "keytar access failure";
      throw new LicenseValidationError(
        "LICENSE_INVALID",
        `Secure license storage is unavailable (${msg}).`,
      );
    }
  }

  private async setMachineBinding(hash: string): Promise<void> {
    try {
      const keytarClient = await this.getKeytarClient();
      await keytarClient.setPassword(
        KEYTAR_SERVICE,
        MACHINE_BINDING_ACCOUNT,
        hash,
      );
    } catch (error: unknown) {
      if (error instanceof LicenseValidationError) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : "keytar access failure";
      throw new LicenseValidationError(
        "LICENSE_INVALID",
        `Secure license storage is unavailable (${msg}).`,
      );
    }
  }

  private verifyCertificate(certificate: SignedLicenseCertificate): void {
    const publicKey = this.getPublicKey();
    if (!publicKey) {
      throw new LicenseValidationError(
        "LICENSE_INVALID",
        "License public key is not configured.",
      );
    }

    const payloadJson = JSON.stringify(certificate.payload);
    const isValidSignature = crypto.verify(
      null,
      Buffer.from(payloadJson, "utf8"),
      publicKey,
      Buffer.from(certificate.signature, "base64"),
    );
    if (!isValidSignature) {
      throw new LicenseValidationError(
        "LICENSE_INVALID",
        "License signature verification failed.",
      );
    }
  }

  private ensureNotExpired(payload: LicensePayload): void {
    if (payload.planType === "lifetime" || !payload.expiresAt) return;
    const expiresAt = new Date(payload.expiresAt).getTime();
    if (!Number.isFinite(expiresAt)) {
      throw new LicenseValidationError("LICENSE_INVALID", "License expiry is invalid.");
    }
    if (Date.now() > expiresAt) {
      throw new LicenseValidationError("LICENSE_EXPIRED", "License has expired.");
    }
  }

  private async enforceMachineBinding(payload: LicensePayload): Promise<void> {
    if (!payload.machineBindingRequired) return;

    const currentHash = this.getMachineFingerprintHash();
    const storedHash = await this.getStoredMachineBinding();
    if (!storedHash) {
      await this.setMachineBinding(currentHash);
      return;
    }
    if (storedHash !== currentHash) {
      throw new LicenseValidationError(
        "LICENSE_INVALID",
        "License is bound to a different machine.",
      );
    }
  }

  private decodeCertificate(rawCode: string): SignedLicenseCertificate {
    try {
      const parsed = JSON.parse(Buffer.from(rawCode, "base64").toString("utf8"));
      if (!parsed?.payload || !parsed?.signature) {
        throw new Error("Malformed certificate payload");
      }
      return parsed as SignedLicenseCertificate;
    } catch (_error) {
      throw new LicenseValidationError("LICENSE_INVALID", "License format is invalid.");
    }
  }

  private async writeEncryptedCertificate(rawCode: string): Promise<void> {
    const key = await this.getOrCreateStorageKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(rawCode, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const blob: EncryptedLicenseBlob = {
      v: 1,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      data: encrypted.toString("base64"),
    };

    const filePath = this.getLicenseFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(blob), "utf8");
  }

  private async readEncryptedCertificate(): Promise<string | null> {
    const filePath = this.getLicenseFilePath();
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const rawBlob = fs.readFileSync(filePath, "utf8");
    const blob = JSON.parse(rawBlob) as EncryptedLicenseBlob;
    if (!blob?.data || !blob?.iv || !blob?.tag) {
      throw new LicenseValidationError("LICENSE_INVALID", "Stored license blob is invalid.");
    }

    const key = await this.getOrCreateStorageKey();
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGO,
      key,
      Buffer.from(blob.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
    try {
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(blob.data, "base64")),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
    } catch (_error) {
      throw new LicenseValidationError("LICENSE_INVALID", "Stored license cannot be decrypted.");
    }
  }

  private successResult(payload: LicensePayload): LicenseValidationResult {
    return {
      state: "ready",
      message: "License is valid.",
      code: "LICENSE_READY",
      expiresAt: payload.expiresAt,
      planType: payload.planType,
    };
  }

  async activateFromCode(rawCode: string): Promise<LicenseValidationResult> {
    if (!rawCode || !rawCode.trim()) {
      throw new LicenseValidationError("LICENSE_INVALID", "License code is required.");
    }
    const certificate = this.decodeCertificate(rawCode.trim());
    this.verifyCertificate(certificate);
    this.ensureNotExpired(certificate.payload);
    await this.enforceMachineBinding(certificate.payload);
    await this.writeEncryptedCertificate(rawCode.trim());

    const result = this.successResult(certificate.payload);
    this.cache = { at: Date.now(), result };
    return result;
  }

async getStatus(forceRefresh = false): Promise<LicenseValidationResult> {
    if (!this.enforcementEnabled()) {
      return {
        state: "ready",
        message: "License enforcement is disabled in this environment.",
        code: "LICENSE_READY",
        expiresAt: null,
        planType: "lifetime",
      };
    }

    if (!forceRefresh && this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.result;
    }

    let rawCode: string | null;
    try {
      rawCode = await this.readEncryptedCertificate();
    } catch (error: any) {
      const failure: LicenseValidationResult = {
        state: "license_invalid",
        message: error?.message || "License validation failed.",
        code: "LICENSE_INVALID",
        expiresAt: null,
        planType: null,
      };
      this.cache = { at: Date.now(), result: failure };
      return failure;
    }
    if (!rawCode) {
      const required: LicenseValidationResult = {
        state: "license_required",
        message: "A valid license is required to use this application.",
        code: "LICENSE_REQUIRED",
        expiresAt: null,
        planType: null,
      };
      this.cache = { at: Date.now(), result: required };
      return required;
    }

    try {
      const certificate = this.decodeCertificate(rawCode);
      this.verifyCertificate(certificate);
      this.ensureNotExpired(certificate.payload);
      await this.enforceMachineBinding(certificate.payload);
      const valid = this.successResult(certificate.payload);
      this.cache = { at: Date.now(), result: valid };
      return valid;
    } catch (error: any) {
      const failure: LicenseValidationResult =
        error instanceof LicenseValidationError
          ? {
              state:
                error.code === "LICENSE_EXPIRED"
                  ? "license_expired"
                  : error.code === "LICENSE_REQUIRED"
                    ? "license_required"
                    : "license_invalid",
              message: error.message,
              code: error.code,
              expiresAt: null,
              planType: null,
            }
          : {
              state: "license_invalid",
              message: "License validation failed.",
              code: "LICENSE_INVALID",
              expiresAt: null,
              planType: null,
            };
      this.cache = { at: Date.now(), result: failure };
      return failure;
    }
  }

  async ensureValidForRequest(): Promise<void> {
    const status = await this.getStatus();
    if (status.state === "ready") return;
    if (status.code === "LICENSE_REQUIRED") {
      throw new LicenseValidationError("LICENSE_REQUIRED", status.message);
    }
    if (status.code === "LICENSE_EXPIRED") {
      throw new LicenseValidationError("LICENSE_EXPIRED", status.message);
    }
    throw new LicenseValidationError("LICENSE_INVALID", status.message);
  }
}

export const licenseService = new LicenseService();
