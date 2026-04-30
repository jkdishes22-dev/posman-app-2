export type LicensePlanType = "trial1m" | "lifetime";

export interface LicensePayload {
  licenseId: string;
  planType: LicensePlanType;
  expiresAt: string | null;
  machineBindingRequired: boolean;
  issuedAt: string;
  customerRef?: string;
  notes?: string;
}

export interface SignedLicenseCertificate {
  payload: LicensePayload;
  signature: string;
}

export type LicenseState =
  | "ready"
  | "license_required"
  | "license_invalid"
  | "license_expired";

export interface LicenseValidationResult {
  state: LicenseState;
  message: string;
  code:
    | "LICENSE_READY"
    | "LICENSE_REQUIRED"
    | "LICENSE_INVALID"
    | "LICENSE_EXPIRED";
  expiresAt: string | null;
  planType: LicensePlanType | null;
}
