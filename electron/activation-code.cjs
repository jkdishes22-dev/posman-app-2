"use strict";

const crypto = require("crypto");

const ACTIVATOR_SALT = "posman-activator-v1";
const PBKDF2_ITERATIONS = 200000;

/**
 * Derive HMAC key from owner passphrase (matches tools/activate.html Web Crypto PBKDF2).
 * @param {string} passphrase
 * @returns {Buffer}
 */
/** Web Crypto PBKDF2 → HMAC-SHA256 deriveKey yields 64 bytes (block size), not 32. */
function deriveActivationHmacKey(passphrase) {
    return crypto.pbkdf2Sync(
        passphrase,
        ACTIVATOR_SALT,
        PBKDF2_ITERATIONS,
        64,
        "sha256",
    );
}

/**
 * Compute the 8-digit activation code for an installation fingerprint (uppercase, no separators).
 * @param {string} fingerprintRaw
 * @param {Buffer} hmacKey
 * @returns {string}
 */
function computeExpectedActivationCode(fingerprintRaw, hmacKey) {
    const sig = crypto.createHmac("sha256", hmacKey).update(fingerprintRaw, "utf8").digest();
    const num = sig.readUInt32BE(0) % 100_000_000;
    return num.toString().padStart(8, "0");
}

/**
 * Verify using a pre-derived HMAC key Buffer (preferred — passphrase never stored in bundle).
 * @param {string} fingerprintRaw Installation ID without dashes (uppercase).
 * @param {string} submittedCode 8 digits, no dash.
 * @param {Buffer} hmacKey 64-byte key derived from owner passphrase via PBKDF2.
 * @returns {boolean}
 */
function verifyWithDerivedKey(fingerprintRaw, submittedCode, hmacKey) {
    if (!Buffer.isBuffer(hmacKey) || hmacKey.length === 0 || !fingerprintRaw || !/^\d{8}$/.test(submittedCode)) {
        return false;
    }
    const expected = computeExpectedActivationCode(fingerprintRaw, hmacKey);
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expected, "utf8"),
            Buffer.from(submittedCode, "utf8"),
        );
    } catch {
        return false;
    }
}

/**
 * @param {string} fingerprintRaw Installation ID without dashes (uppercase).
 * @param {string} submittedCode 8 digits, no dash.
 * @param {string} passphrase Owner activator passphrase.
 * @returns {boolean}
 */
function verifyActivationCode(fingerprintRaw, submittedCode, passphrase) {
    if (!passphrase || !fingerprintRaw || !/^\d{8}$/.test(submittedCode)) {
        return false;
    }
    return verifyWithDerivedKey(fingerprintRaw, submittedCode, deriveActivationHmacKey(passphrase));
}

module.exports = {
    ACTIVATOR_SALT,
    PBKDF2_ITERATIONS,
    deriveActivationHmacKey,
    computeExpectedActivationCode,
    verifyWithDerivedKey,
    verifyActivationCode,
};
