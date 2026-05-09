"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import { decodeJwt, DecodedToken } from "./utils/tokenUtils";
import { useAuth } from "./contexts/AuthContext";
import { useApiCall } from "./utils/apiUtils";
import { ApiErrorResponse } from "./utils/errorUtils";
import ErrorDisplay from "./components/ErrorDisplay";
import SubmitBillVirtualKeyboard, {
  SubmitBillKeyboardMode,
} from "./components/SubmitBillVirtualKeyboard";

type SetupState =
  | "ready"
  | "db_server_unavailable"
  | "initialization_required"
  | "license_required"
  | "license_invalid"
  | "license_expired"
  | "initializing"
  | "failed";

interface SetupStatus {
  state: SetupState;
  message: string;
  code: string;
  guidance?: {
    title: string;
    steps: string[];
  };
}

const isLicenseBlockedState = (state: SetupState) =>
  state === "license_required" || state === "license_expired" || state === "license_invalid";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [activeField, setActiveField] = useState<"username" | "password">("username");
  const [keyboardMode, setKeyboardMode] = useState<SubmitBillKeyboardMode>("numeric");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [isRunningSetup, setIsRunningSetup] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [licenseCode, setLicenseCode] = useState("");
  const [isActivatingLicense, setIsActivatingLicense] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const apiCall = useApiCall();

  const clearErrors = useCallback(() => {
    setError("");
    setErrorDetails(null);
  }, []);

  const readSetupStatus = useCallback(async (retry = false) => {
    setIsCheckingSetup(true);
    try {
      const suffix = retry ? "?retry=1" : "";
      const result = await apiCall<SetupStatus>(`/api/system/setup-status${suffix}`);
      if (result.status === 200 && result.data) {
        setSetupStatus(result.data);
        if (result.data.state === "db_server_unavailable") {
          setError(result.data.message);
          setErrorDetails({ message: result.data.message, status: 503 });
        } else if (result.data.state === "failed") {
          setError(result.data.message);
          setErrorDetails({ message: result.data.message, status: 500 });
        } else {
          clearErrors();
        }
      } else {
        setSetupStatus({
          state: "failed",
          message: result.error || "Unable to check setup status.",
          code: "SETUP_FAILED",
        });
        setError(result.error || "Unable to check setup status.");
        setErrorDetails(result.errorDetails || { status: 500 });
      }
    } catch (err) {
      setSetupStatus({
        state: "failed",
        message: "Network error while checking setup status.",
        code: "SETUP_FAILED",
      });
      setError("Network error while checking setup status.");
      setErrorDetails({ message: "Network error while checking setup status.", networkError: true, status: 0 });
    } finally {
      setIsCheckingSetup(false);
    }
  }, [apiCall, clearErrors]);

  useEffect(() => {
    readSetupStatus();
  }, [readSetupStatus]);

  // Redirect if already authenticated (but not if we're already redirecting from login)
  useEffect(() => {
    if (isAuthenticated && !isRedirecting && !isLoading) {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decodedToken = decodeJwt(token);
          if (decodedToken && decodedToken.roles && decodedToken.roles.length > 0) {
            setIsRedirecting(true);
            const primaryRole = decodedToken.roles[0];
            if (primaryRole === "admin") {
              router.push("/admin");
            } else if (primaryRole === "supervisor") {
              router.push("/supervisor");
            } else if (primaryRole === "sales") {
              router.push("/home/billing");
            } else if (primaryRole === "cashier") {
              router.push("/home/cashier");
            } else if (primaryRole === "storekeeper") {
              router.push("/storekeeper");
            } else {
              router.push("/home");
            }
          }
        } catch (error) {
          console.error("Error decoding token:", error);
        }
      }
    }
  }, [isAuthenticated, router, isRedirecting, isLoading]);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (setupStatus && setupStatus.state !== "ready") {
      setError(setupStatus.message);
      if (setupStatus.state === "db_server_unavailable") {
        setErrorDetails({ message: setupStatus.message, status: 503 });
      } else if (setupStatus.state === "initialization_required") {
        setErrorDetails({ message: setupStatus.message, status: 428 });
      } else {
        setErrorDetails({ message: setupStatus.message, status: 500 });
      }
      return;
    }

    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (isSubmitting) {
      return; // Prevent double submission
    }

    const formData = { username, password };
    setIsSubmitting(true);
    setError("");
    setErrorDetails(null);

    try {
      const result = await apiCall("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (result.status === 200) {
        const { token, role } = result.data;
        const decodedToken = decodeJwt(token);
        // Include id from token root level, not just user object
        const userData = decodedToken ? {
          ...(decodedToken.user || {}),
          id: decodedToken.id,
          roles: decodedToken.roles || []
        } : null;

        // Use the auth context to handle login
        login(token, userData);

        // Set redirecting flag to prevent useEffect from also redirecting
        setIsRedirecting(true);

        // Use the decoded token roles for consistent redirect logic
        if (decodedToken && decodedToken.roles && decodedToken.roles.length > 0) {
          const primaryRole = decodedToken.roles[0];
          if (primaryRole === "admin") {
            router.push("/admin");
          } else if (primaryRole === "supervisor") {
            router.push("/supervisor");
          } else if (primaryRole === "sales") {
            router.push("/home/billing");
          } else if (primaryRole === "cashier") {
            router.push("/home/cashier");
          } else if (primaryRole === "storekeeper") {
            router.push("/storekeeper");
          } else {
            router.push("/home");
          }
        }
      } else {
        if (result.status === 428 || result.status === 503) {
          // Ensure setup actions are visible when backend blocks login on setup state.
          await readSetupStatus(true);
          setError(result.error || "System setup is required before login.");
          setErrorDetails(result.errorDetails || { status: result.status });
          setIsSubmitting(false);
          return;
        }

        // Show specific error message for invalid credentials
        if (result.status === 401) {
          setError("Invalid username or password");
        } else {
          setError(result.error || "Login failed. Please try again.");
        }
        setErrorDetails(result.errorDetails);
        setIsSubmitting(false);
      }
    } catch (err) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setIsSubmitting(false);
    }
  };

  const handleInitializeSetup = async () => {
    setIsRunningSetup(true);
    clearErrors();
    try {
      const result = await apiCall<SetupStatus>("/api/system/setup-initialize", {
        method: "POST",
      });

      if (result.status === 200 && result.data) {
        setSetupStatus(result.data);
        if (result.data.state === "ready") {
          clearErrors();
        } else {
          setError(result.data.message || "Setup did not complete.");
          setErrorDetails({ message: result.data.message || "Setup did not complete.", status: 500 });
        }
      } else {
        setError(result.error || "Database setup failed.");
        setErrorDetails(result.errorDetails || { status: result.status });
      }
    } catch (err) {
      setError("Network error during setup initialization.");
      setErrorDetails({ message: "Network error during setup initialization.", networkError: true, status: 0 });
    } finally {
      setIsRunningSetup(false);
      await readSetupStatus(true);
    }
  };

  const handleInputClick = (field: "username" | "password") => {
    setActiveField(field);
  };

  const focusPasswordField = useCallback(() => {
    setActiveField("password");
    passwordInputRef.current?.focus();
  }, []);

  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      focusPasswordField();
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseCode.trim()) {
      setError("Please enter a valid license code.");
      setErrorDetails({ message: "Please enter a valid license code.", status: 400 });
      return;
    }

    setIsActivatingLicense(true);
    clearErrors();
    try {
      const result = await apiCall("/api/system/license-activate", {
        method: "POST",
        body: JSON.stringify({ licenseCode: licenseCode.trim() }),
      });

      if (result.status === 200) {
        setLicenseCode("");
        await readSetupStatus(true);
        clearErrors();
      } else {
        setError(result.error || "License activation failed.");
        setErrorDetails(result.errorDetails || { status: result.status });
      }
    } catch (_error) {
      setError("Network error during license activation.");
      setErrorDetails({
        message: "Network error during license activation.",
        networkError: true,
        status: 0,
      });
    } finally {
      setIsActivatingLicense(false);
    }
  };

  const handleVirtualCharacter = (ch: string) => {
    if (activeField === "username") setUsername((p) => p + ch);
    else setPassword((p) => p + ch);
  };

  const handleVirtualSpecialKey = (key: "Backspace" | "Clear" | "Space") => {
    if (key === "Backspace") {
      if (activeField === "username") setUsername((p) => p.slice(0, -1));
      else setPassword((p) => p.slice(0, -1));
    } else if (key === "Clear") {
      if (activeField === "username") setUsername("");
      else setPassword("");
    } else {
      if (activeField === "username") setUsername((p) => p + " ");
      else setPassword((p) => p + " ");
    }
  };

  if (isLoading) {
    return (
      <div className="container p-5">
        <div className="row px-5">
          <div className="col d-flex flex-column justify-content-center align-items-center">
            <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-5">
      <div className="row px-5">
        <div className="col d-flex flex-column">
          <div className="p-3 border bg-light mb-3">
            <form onSubmit={handleSubmit} className="px-4 pt-3 pb-2">
              <ErrorDisplay
                error={error}
                errorDetails={errorDetails}
                onDismiss={() => {
                  clearErrors();
                }}
              />
              {isCheckingSetup && (
                <div className="alert alert-info">
                  <div className="d-flex align-items-center">
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Checking system setup...
                  </div>
                </div>
              )}
              {!isCheckingSetup && setupStatus && setupStatus.state !== "ready" && (
                <div className={`alert ${setupStatus.state === "initialization_required" ? "alert-warning" : "alert-danger"}`}>
                  <h6 className="mb-2">
                    {isLicenseBlockedState(setupStatus.state)
                      ? "License activation required"
                      : setupStatus.guidance?.title || "System setup required"}
                  </h6>
                  {isLicenseBlockedState(setupStatus.state) ? (
                    <>
                      <p className="mb-2">A valid license is required to use this application.</p>
                      <p className="mb-2">
                        Enter a valid license code on the login screen.
                        <br />
                        If your trial expired, request a renewal code from the author.
                      </p>
                    </>
                  ) : (
                    <p className="mb-2">{setupStatus.message}</p>
                  )}
                  {!isLicenseBlockedState(setupStatus.state) &&
                    setupStatus.guidance?.steps &&
                    setupStatus.guidance.steps.length > 0 && (
                    <ul className="mb-3">
                      {setupStatus.guidance.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                    )}
                  <div className="d-flex gap-2">
                    {setupStatus.state === "initialization_required" && (
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        onClick={handleInitializeSetup}
                        disabled={isRunningSetup}
                      >
                        {isRunningSetup ? "Initializing..." : "Run Initial Setup"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => readSetupStatus(true)}
                      disabled={isRunningSetup || isActivatingLicense}
                    >
                      Retry Check
                    </button>
                  </div>
                  {isLicenseBlockedState(setupStatus.state) && (
                    <div className="mt-3">
                      <label htmlFor="licenseCode" className="form-label fw-semibold">
                        License Code
                      </label>
                      <textarea
                        id="licenseCode"
                        className="form-control mb-2"
                        rows={3}
                        value={licenseCode}
                        onChange={(e) => setLicenseCode(e.target.value)}
                        placeholder="Paste signed license code"
                        disabled={isActivatingLicense}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleActivateLicense}
                        disabled={isActivatingLicense || !licenseCode.trim()}
                      >
                        {isActivatingLicense ? "Activating..." : "Activate License"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="form-outline mb-4 col-xs-3">
                <label className="form-label" htmlFor="username">
                  User name / code
                </label>
                <div className="d-flex align-items-stretch gap-2">
                  <input
                    type="text"
                    id="username"
                    className={`form-control flex-grow-1${activeField === "username" ? " border-primary border-2" : ""}`}
                    autoComplete="username"
                    enterKeyHint="next"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => handleInputClick("username")}
                    onClick={() => handleInputClick("username")}
                    onKeyDown={handleUsernameKeyDown}
                  />
                  <button type="button" className="btn btn-primary px-4" onClick={focusPasswordField}>
                    Next
                  </button>
                </div>
              </div>
              <div className="form-outline mb-4">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <div
                  className={`input-group${activeField === "password" ? " border border-primary border-2 rounded overflow-hidden" : ""}`}
                >
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className="form-control lg-4"
                    autoComplete="current-password"
                    enterKeyHint="go"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => handleInputClick("password")}
                    onClick={() => handleInputClick("password")}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden />
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={
                  isSubmitting ||
                  isRedirecting ||
                  !username ||
                  !password ||
                  isActivatingLicense ||
                  (setupStatus !== null && setupStatus.state !== "ready")
                }
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Logging in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
            <div className="px-4 pb-3 pt-0">
              <div className="btn-group w-100 mb-2" role="group" aria-label="Keyboard layout">
                <button
                  type="button"
                  className={`btn ${keyboardMode === "numeric" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setKeyboardMode("numeric")}
                >
                  123
                </button>
                <button
                  type="button"
                  className={`btn ${keyboardMode === "alpha" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setKeyboardMode("alpha")}
                >
                  ABC
                </button>
              </div>
              <SubmitBillVirtualKeyboard
                mode={keyboardMode}
                numericDecimal={false}
                numericHeading="Numbers"
                alphaHeading="Letters & numbers"
                alphaSpacing="comfortable"
                onCharacter={handleVirtualCharacter}
                onSpecialKey={handleVirtualSpecialKey}
              />
            </div>
          </div>
        </div>
        <div className="col d-flex flex-column">
          <div className="p-3 border bg-light mb-3">
            <div className="p-3 border bg-light h-100 d-flex flex-column justify-content-center align-items-center">
              <img
                src="/images/jk-big.png"
                width={300}
                height={500}
                className="m-2"
                alt="JK PosMan"
                style={{ maxWidth: "100%", height: "auto", objectFit: "contain" }}
              />
              <span className="text-muted display-4">PosMan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
