"use client";
import React, { useState } from "react";
import { useApiCall } from "../utils/apiUtils";

type Step = "username" | "verify" | "success";
type VerifyTab = "answer" | "code";

interface Props {
  show: boolean;
  onHide: () => void;
}

export default function ForgotPasswordModal({ show, onHide }: Props) {
  const apiCall = useApiCall();

  const [step, setStep] = useState<Step>("username");
  const [verifyTab, setVerifyTab] = useState<VerifyTab>("answer");
  const [username, setUsername] = useState("");
  const [question, setQuestion] = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [answer, setAnswer] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep("username");
    setVerifyTab("answer");
    setUsername("");
    setQuestion("");
    setForgotToken("");
    setAnswer("");
    setRecoveryCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onHide();
  };

  const handleGetQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError("");
    setLoading(true);
    try {
      const result = await apiCall("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ username: username.trim() }),
      });
      if (result.status === 200) {
        setQuestion(result.data.question);
        setForgotToken(result.data.forgotToken);
        setStep("verify");
      } else {
        setError(result.error || "Username not found or no security question configured.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    const payload: Record<string, string> = { forgotToken, newPassword };
    if (verifyTab === "answer") {
      if (!answer.trim()) { setError("Please enter your answer."); return; }
      payload.answer = answer.trim();
    } else {
      if (!recoveryCode.trim()) { setError("Please enter your recovery code."); return; }
      payload.recoveryCode = recoveryCode.trim();
    }

    setError("");
    setLoading(true);
    try {
      const result = await apiCall("/api/auth/forgot-password/confirm", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (result.status === 200) {
        setStep("success");
      } else {
        setError(result.error || "Verification failed. Please check your answer or code.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Reset Password</h5>
            <button type="button" className="btn-close" onClick={handleClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}

            {step === "username" && (
              <form onSubmit={handleGetQuestion}>
                <div className="mb-3">
                  <label className="form-label">Enter your username</label>
                  <input
                    type="text"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={loading || !username.trim()}>
                  {loading ? "Checking…" : "Continue"}
                </button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleReset}>
                <ul className="nav nav-tabs mb-3">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link${verifyTab === "answer" ? " active" : ""}`}
                      onClick={() => { setVerifyTab("answer"); setError(""); }}
                    >
                      Security question
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link${verifyTab === "code" ? " active" : ""}`}
                      onClick={() => { setVerifyTab("code"); setError(""); }}
                    >
                      Recovery code
                    </button>
                  </li>
                </ul>

                {verifyTab === "answer" && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">{question}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Your answer"
                      autoFocus
                    />
                  </div>
                )}
                {verifyTab === "code" && (
                  <div className="mb-3">
                    <label className="form-label">Recovery code</label>
                    <input
                      type="text"
                      className="form-control font-monospace text-uppercase"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                      placeholder="e.g. AB12CD34"
                      maxLength={8}
                      autoFocus
                    />
                    <div className="form-text">8-character code from Admin Settings → Account Security</div>
                  </div>
                )}

                <hr />
                <div className="mb-3">
                  <label className="form-label">New password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={4}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm new password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-success w-100" disabled={loading}>
                  {loading ? "Resetting…" : "Reset Password"}
                </button>
              </form>
            )}

            {step === "success" && (
              <div className="text-center py-2">
                <div className="text-success mb-3" style={{ fontSize: "3rem" }}>✓</div>
                <p className="fw-semibold mb-1">Password reset successfully!</p>
                <p className="text-muted small">You can now log in with your new password.</p>
                <button className="btn btn-primary mt-2" onClick={handleClose}>Back to Login</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
