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
};

function formatDateYmd(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toISOString().slice(0, 10);
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

  useEffect(() => {
    void fetchDiagnostics(false);
  }, []);

  return (
    <SecureRoute roleRequired="admin">
      <RoleAwareLayout>
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">License Diagnostics</h4>
              <p className="text-muted mb-0">Read-only license health details for administrators.</p>
            </div>
            <button className="btn btn-outline-primary btn-sm" onClick={() => fetchDiagnostics(true)} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

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
                </div>
              </div>
            </div>
          )}
        </div>
      </RoleAwareLayout>
    </SecureRoute>
  );
}
