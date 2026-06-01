"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { decodeJwt } from "../utils/tokenUtils";
import { useApiCall } from "../utils/apiUtils";

function getDashboardPath(primaryRole: string | undefined): string {
  switch (primaryRole) {
    case "admin": return "/admin";
    case "supervisor": return "/supervisor";
    case "sales": return "/home/billing";
    case "cashier": return "/home/cashier";
    case "storekeeper": return "/storekeeper";
    default: return "/home";
  }
}

const ChangePasswordPage = () => {
  const router = useRouter();
  const apiCall = useApiCall();

  const [isClient, setIsClient] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dashboardPath, setDashboardPath] = useState("/home");

  useEffect(() => {
    setIsClient(true);
    // Redirect to login if not authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    const decoded = decodeJwt(token);
    if (!decoded) {
      router.push("/");
      return;
    }
    // Compute dashboard path for post-change redirect
    if (decoded.roles && decoded.roles.length > 0) {
      setDashboardPath(getDashboardPath(decoded.roles[0]));
    }
  }, [router]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword.trim()) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword.trim()) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiCall("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (result.status === 200) {
        // Clear the enforcement flag so SecureRoute no longer redirects here
        localStorage.removeItem("must_change_password");
        setSuccess(true);
        // Redirect to dashboard after a brief success message
        setTimeout(() => {
          router.push(dashboardPath);
        }, 1800);
      } else {
        setError(result.error || result.data?.error || "Failed to update password. Please try again.");
        setIsSubmitting(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }, [apiCall, currentPassword, newPassword, confirmPassword, dashboardPath, router]);

  if (!isClient) return null;

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-7 col-lg-5">
            <div
              className="card border-0 shadow-lg"
              style={{ borderRadius: "1rem", overflow: "hidden" }}
            >
              {/* Header */}
              <div
                className="card-header border-0 text-white text-center py-4"
                style={{ background: "linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)" }}
              >
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white bg-opacity-25 mb-3"
                  style={{ width: 64, height: 64 }}
                >
                  <i className="bi bi-shield-lock-fill" style={{ fontSize: "1.8rem" }}></i>
                </div>
                <h4 className="fw-bold mb-1">Password Change Required</h4>
                <p className="mb-0 small opacity-75">
                  You are using the default password. Please set a new password to continue.
                </p>
              </div>

              <div className="card-body p-4">
                {success ? (
                  <div className="text-center py-3">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10 mb-3"
                      style={{ width: 64, height: 64 }}
                    >
                      <i className="bi bi-check-circle-fill text-success" style={{ fontSize: "2rem" }}></i>
                    </div>
                    <h5 className="fw-bold text-success mb-2">Password Updated!</h5>
                    <p className="text-muted small">Redirecting to your dashboard…</p>
                    <div className="spinner-border spinner-border-sm text-success mt-1" role="status">
                      <span className="visually-hidden">Redirecting…</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    {error && (
                      <div className="alert alert-primary d-flex align-items-center py-2 mb-3" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2 flex-shrink-0"></i>
                        <span className="small">{error}</span>
                      </div>
                    )}

                    {/* Current password */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted text-uppercase letter-spacing-1">
                        Current Password
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="bi bi-lock text-muted"></i>
                        </span>
                        <input
                          type={showCurrent ? "text" : "password"}
                          className="form-control border-start-0 border-end-0"
                          placeholder="Enter current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          autoComplete="current-password"
                          autoFocus
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary border-start-0"
                          onClick={() => setShowCurrent((p) => !p)}
                          tabIndex={-1}
                          aria-label={showCurrent ? "Hide current password" : "Show current password"}
                        >
                          <i className={`bi ${showCurrent ? "bi-eye-slash" : "bi-eye"}`}></i>
                        </button>
                      </div>
                    </div>

                    {/* New password */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted text-uppercase letter-spacing-1">
                        New Password
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="bi bi-key text-muted"></i>
                        </span>
                        <input
                          type={showNew ? "text" : "password"}
                          className="form-control border-start-0 border-end-0"
                          placeholder="At least 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoComplete="new-password"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary border-start-0"
                          onClick={() => setShowNew((p) => !p)}
                          tabIndex={-1}
                          aria-label={showNew ? "Hide new password" : "Show new password"}
                        >
                          <i className={`bi ${showNew ? "bi-eye-slash" : "bi-eye"}`}></i>
                        </button>
                      </div>
                      {newPassword.length > 0 && newPassword.length < 8 && (
                        <div className="form-text text-primary small">
                          <i className="bi bi-info-circle me-1"></i>
                          Must be at least 8 characters
                        </div>
                      )}
                    </div>

                    {/* Confirm new password */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold small text-muted text-uppercase letter-spacing-1">
                        Confirm New Password
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="bi bi-key-fill text-muted"></i>
                        </span>
                        <input
                          type={showConfirm ? "text" : "password"}
                          className="form-control border-start-0 border-end-0"
                          placeholder="Repeat new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary border-start-0"
                          onClick={() => setShowConfirm((p) => !p)}
                          tabIndex={-1}
                          aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                        >
                          <i className={`bi ${showConfirm ? "bi-eye-slash" : "bi-eye"}`}></i>
                        </button>
                      </div>
                      {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                        <div className="form-text text-primary small">
                          <i className="bi bi-x-circle me-1"></i>
                          Passwords do not match
                        </div>
                      )}
                      {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 8 && (
                        <div className="form-text text-success small">
                          <i className="bi bi-check-circle me-1"></i>
                          Passwords match
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 fw-semibold py-2"
                      disabled={isSubmitting}
                      style={{ borderRadius: "0.5rem" }}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Updating…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-shield-check me-2"></i>
                          Set New Password
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              <div className="card-footer bg-light border-0 text-center py-3">
                <p className="text-muted small mb-0">
                  <i className="bi bi-shield-check me-1 text-success"></i>
                  Your password is encrypted and stored securely.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
