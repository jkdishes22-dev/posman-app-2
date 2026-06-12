"use client";

import { useEffect, useState } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import SecureRoute from "../../components/SecureRoute";
import { useApiCall } from "../../utils/apiUtils";
import { ApiErrorResponse } from "../../utils/errorUtils";
import ErrorDisplay from "../../components/ErrorDisplay";

type LicenseDiagnostics = {
  state: string;
  code: string;
  message: string;
  planType: string | null;
  expiresAt: string | null;
  checkedAt: string;
  machineId?: string;
};

type LicenseWarningSettings = {
  months: number;
  days: number;
};

function formatDateYmd(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toISOString().slice(0, 10);
}

function getLicenseExpiryWarning(
  expiresAt: string | null,
  warning: LicenseWarningSettings
): { variant: "warning" | "danger"; message: string } | null {
  if (!expiresAt) return null;
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) return null;

  const warningStart = new Date(expiryDate);
  warningStart.setMonth(warningStart.getMonth() - Math.max(0, warning.months || 0));
  warningStart.setDate(warningStart.getDate() - Math.max(0, warning.days || 0));

  const now = new Date();
  const msInDay = 1000 * 60 * 60 * 24;
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / msInDay);

  if (daysUntilExpiry < 0) {
    return { variant: "danger", message: "License has expired. Please renew to avoid disruption." };
  }
  if (now >= warningStart) {
    const dayLabel = daysUntilExpiry === 1 ? "day" : "days";
    return { variant: "warning", message: `License expires in ${daysUntilExpiry} ${dayLabel}. Please renew soon.` };
  }
  return null;
}

function statusBadgeClass(state: string): string {
  if (state === "ready") return "bg-success-subtle text-success-emphasis border border-success-subtle";
  if (state === "license_expired") return "bg-warning-subtle text-warning-emphasis border border-warning-subtle";
  return "bg-danger-subtle text-danger-emphasis border border-danger-subtle";
}

export default function AdminLicenseDiagnosticsPage() {
  const apiCall = useApiCall();
  const [data, setData] = useState<LicenseDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [licenseWarning, setLicenseWarning] = useState<LicenseWarningSettings>({ months: 0, days: 7 });

  const [showActivationForm, setShowActivationForm] = useState(false);
  const [licenseCode, setLicenseCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);

  const expiryWarning = getLicenseExpiryWarning(data?.expiresAt ?? null, licenseWarning);

  const fetchDiagnostics = async (refresh = false) => {
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    try {
      const suffix = refresh ? "?refresh=1" : "";
      const result = await apiCall<LicenseDiagnostics>(`/api/system/license-diagnostics${suffix}`);
      if (result.status === 200 && result.data) {
        setData(result.data);
      } else {
        setData(null);
        setError(result.error || "Failed to load license diagnostics.");
        setErrorDetails(result.errorDetails || { status: result.status });
      }
    } catch (_error) {
      setData(null);
      setError("Network error while loading license diagnostics.");
      setErrorDetails({
        message: "Network error while loading license diagnostics.",
        networkError: true,
        status: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    setActivationResult(null);
    try {
      const result = await apiCall("/api/system/license-reset-cache", { method: "POST" });
      if (result.status === 200 && result.data) {
        setData(result.data as LicenseDiagnostics);
        setActivationResult({ success: true, message: "License cache cleared. Status re-checked from disk." });
      } else {
        setActivationResult({ success: false, message: result.error || "Failed to clear license cache." });
      }
    } catch {
      setActivationResult({ success: false, message: "Network error while clearing cache." });
    } finally {
      setClearingCache(false);
    }
  };

  const handleActivate = async () => {
    if (!licenseCode.trim()) return;
    setActivating(true);
    setActivationResult(null);
    try {
      const result = await apiCall("/api/system/license-activate", {
        method: "POST",
        body: JSON.stringify({ licenseCode: licenseCode.trim() }),
      });
      if (result.status === 200) {
        setActivationResult({ success: true, message: "License activated successfully." });
        setLicenseCode("");
        setShowActivationForm(false);
        await fetchDiagnostics(true);
      } else {
        setActivationResult({ success: false, message: result.error || "License activation failed." });
      }
    } catch {
      setActivationResult({ success: false, message: "Network error during license activation." });
    } finally {
      setActivating(false);
    }
  };

  useEffect(() => {
    void fetchDiagnostics(false);
  }, []);

  useEffect(() => {
    apiCall("/api/system/settings?key=system_settings&sub=license_warning")
      .then((result) => {
        if (result.status === 200 && result.data?.value && typeof result.data.value === "object") {
          setLicenseWarning({
            months: Math.max(0, Number(result.data.value.months || 0)),
            days: Math.max(0, Number(result.data.value.days || 0)),
          });
        }
      })
      .catch(() => {});
  }, [apiCall]);

  return (
    <SecureRoute roleRequired="admin">
      <RoleAwareLayout>
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">License</h4>
              <p className="text-muted mb-0">License status and activation for administrators.</p>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setShowActivationForm((v) => !v);
                  setActivationResult(null);
                  setLicenseCode("");
                }}
              >
                {showActivationForm ? "Cancel" : "Add activation code"}
              </button>
              <button
                className="btn btn-outline-warning btn-sm"
                onClick={handleClearCache}
                disabled={clearingCache || loading}
                title="Delete the on-disk license cache and re-validate from scratch"
              >
                {clearingCache ? "Clearing..." : "Clear Cache"}
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => fetchDiagnostics(true)} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {activationResult && (
            <div className={`alert alert-${activationResult.success ? "success" : "danger"} alert-dismissible`} role="alert">
              {activationResult.message}
              <button type="button" className="btn-close" onClick={() => setActivationResult(null)} aria-label="Close" />
            </div>
          )}

          {showActivationForm && (
            <div className="card shadow-sm mb-4">
              <div className="card-header fw-semibold">Enter Activation Code</div>
              <div className="card-body">
                <p className="text-muted small mb-3">
                  Paste the license code provided for this installation. The code is tied to this machine&apos;s hardware.
                </p>
                <div className="mb-3">
                  <label htmlFor="license-code-input" className="form-label fw-medium">License Code</label>
                  <textarea
                    id="license-code-input"
                    className="form-control font-monospace"
                    rows={4}
                    placeholder="Paste your license code here…"
                    value={licenseCode}
                    onChange={(e) => setLicenseCode(e.target.value)}
                    disabled={activating}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleActivate}
                  disabled={activating || !licenseCode.trim()}
                >
                  {activating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Activating…
                    </>
                  ) : (
                    "Activate License"
                  )}
                </button>
              </div>
            </div>
          )}

          <ErrorDisplay
            error={error}
            errorDetails={errorDetails}
            onDismiss={() => {
              setError(null);
              setErrorDetails(null);
            }}
          />

          {!error && data && (
            <div className="card shadow-sm">
              <div className="card-body">
                {expiryWarning && (
                  <div
                    className={`alert alert-${expiryWarning.variant} mb-3`}
                    role="alert"
                  >
                    {expiryWarning.message}
                  </div>
                )}
                <div className="row g-3 align-items-stretch">
                  <div className="col-md-4">
                    <div className="small text-muted mb-1">State</div>
                    <span className={`badge rounded-pill px-3 py-2 ${statusBadgeClass(data.state)}`}>
                      {data.state}
                    </span>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted mb-1">Code</div>
                    <span className="badge rounded-pill px-3 py-2 bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">
                      {data.code}
                    </span>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted mb-1">Plan</div>
                    <div className="fw-semibold text-capitalize">{data.planType || "n/a"}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="small text-muted mb-1">Expires</div>
                    <div className="fw-semibold">{formatDateYmd(data.expiresAt)}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="small text-muted mb-1">Checked At</div>
                    <div className="fw-semibold">{formatDateYmd(data.checkedAt)}</div>
                  </div>
                  <div className="col-12">
                    <div className="small text-muted mb-1">Message</div>
                    <div className="p-2 rounded bg-light border fw-semibold">{data.message}</div>
                  </div>
                  {data.machineId && (
                    <div className="col-12">
                      <div className="small text-muted mb-1">Installation Code</div>
                      <div className="p-2 rounded bg-light border font-monospace small text-break">{data.machineId}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </RoleAwareLayout>
    </SecureRoute>
  );
}