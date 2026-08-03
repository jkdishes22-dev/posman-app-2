"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

interface LicenseStatus {
  state: "ready" | "license_required" | "license_invalid" | "license_expired";
  message: string;
  expiresAt: string | null;
  planType: string | null;
  machineId: string | null;
}

interface WarningSettings {
  months: number;
  days: number;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;

function getDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiry)) return null;
  return Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));
}

function isInWarningWindow(expiresAt: string | null, w: WarningSettings): boolean {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) return false;
  const warningStart = new Date(expiryDate);
  warningStart.setMonth(warningStart.getMonth() - Math.max(0, w.months));
  warningStart.setDate(warningStart.getDate() - Math.max(0, w.days));
  const now = new Date();
  return now >= warningStart && now < expiryDate;
}

function overlayTitle(state: LicenseStatus["state"]): string {
  if (state === "license_expired") return "License Expired";
  if (state === "license_invalid") return "License Invalid";
  return "License Required";
}

function overlayBody(state: LicenseStatus["state"], message: string): string {
  if (state === "license_expired")
    return "Your license has expired. All activity has been paused until the license is renewed.";
  if (state === "license_invalid")
    return `License validation failed: ${message} All activity has been paused until the license is resolved.`;
  return "A valid license is required to continue using this application.";
}

export default function LicenseStatusMonitor() {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [warning, setWarning] = useState<WarningSettings>({ months: 0, days: 7 });
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const warningFetched = useRef(false);

  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("admin");

  const fetchStatus = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const resp = await fetch("/api/system/license-status", { headers });
      const data = await resp.json();
      if (data?.state) setStatus(data as LicenseStatus);
    } catch {
      // Silent — do not disrupt the UI if a poll fails
    }
  }, []);

  const fetchWarningSettings = useCallback(async () => {
    if (warningFetched.current) return;
    warningFetched.current = true;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const resp = await fetch("/api/system/settings?key=system_settings&sub=license_warning", { headers });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.value && typeof data.value === "object") {
          setWarning({
            months: Math.max(0, Number(data.value.months || 0)),
            days: Math.max(0, Number(data.value.days || 0)),
          });
        }
      }
    } catch {
      // Non-fatal; use default warning window
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchStatus();
    if (isAdmin) fetchWarningSettings();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, isAdmin, fetchStatus, fetchWarningSettings]);

  if (!isAuthenticated || !status) return null;

  // ── Hard-lock overlay ────────────────────────────────────────────────────
  // Never cover the license settings page itself — the admin must be able to
  // reach "Clear Cache" / "Refresh" / "Activate" even when the overlay would
  // otherwise fire. The overlay on every other page still guides them there.
  const isLicensePage = pathname?.startsWith("/admin/license");

  if (status.state !== "ready" && !isLicensePage) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(10, 15, 30, 0.92)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(3px)",
        }}
        aria-modal="true"
        role="alertdialog"
        aria-labelledby="license-lock-title"
      >
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 10,
            padding: "2rem",
            maxWidth: 460,
            width: "90%",
            textAlign: "center",
            color: "#94a3b8",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
            {status.state === "license_expired" ? "⏰" : "🔒"}
          </div>
          <h5
            id="license-lock-title"
            style={{ color: "#f1f5f9", marginBottom: "0.5rem" }}
          >
            {overlayTitle(status.state)}
          </h5>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
            {overlayBody(status.state, status.message)}
          </p>
          {isAdmin ? (
            <a
              href="/admin/license"
              className="btn btn-primary btn-sm"
              style={{ textDecoration: "none" }}
            >
              Go to License Settings
            </a>
          ) : (
            <>
              <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "1rem" }}>
                Please contact your <strong style={{ color: "#94a3b8" }}>administrator</strong> to resolve this.
              </p>
              {status.machineId && (
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.4rem" }}>
                    Share this <strong style={{ color: "#94a3b8" }}>Installation Code</strong> with your administrator:
                  </p>
                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 6,
                      padding: "0.5rem 0.75rem",
                      fontFamily: "monospace",
                      fontSize: "0.7rem",
                      color: "#7dd3fc",
                      wordBreak: "break-all",
                      userSelect: "all",
                    }}
                  >
                    {status.machineId}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Expiry warning banner ────────────────────────────────────────────────
  if (bannerDismissed) return null;
  if (!isInWarningWindow(status.expiresAt, warning)) return null;

  const daysLeft = getDaysUntilExpiry(status.expiresAt);
  const dayLabel = daysLeft === 1 ? "day" : "days";

  return (
    <div
      className="alert alert-warning alert-dismissible d-flex align-items-center gap-2 mb-0 rounded-0 border-start-0 border-end-0"
      role="alert"
      style={{ borderTop: 0 }}
    >
      <i className="bi bi-exclamation-triangle-fill flex-shrink-0" aria-hidden="true" />
      <span>
        <strong>License expiring soon</strong> — {daysLeft !== null ? `${daysLeft} ${dayLabel} remaining` : "expiry approaching"}.{" "}
        {isAdmin ? (
          <a href="/admin/license" className="alert-link">
            Renew your license
          </a>
        ) : (
          <>Contact your administrator to renew.</>
        )}
      </span>
      <button
        type="button"
        className="btn-close ms-auto"
        aria-label="Dismiss"
        onClick={() => setBannerDismissed(true)}
      />
    </div>
  );
}
