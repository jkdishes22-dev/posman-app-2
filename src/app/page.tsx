"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import Image from "next/image";
import jwt from "jsonwebtoken";
import { DecodedToken } from "./components/SecureRoute";
import { useAuth } from "./contexts/AuthContext";
import { useApiCall } from "./utils/apiUtils";
import { ApiErrorResponse } from "./utils/errorUtils";
import ErrorDisplay from "./components/ErrorDisplay";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [activeField, setActiveField] = useState("username");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const apiCall = useApiCall();

  // Redirect if already authenticated (but not if we're already redirecting from login)
  useEffect(() => {
    if (isAuthenticated && !isRedirecting && !isLoading) {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decodedToken = jwt.decode(token) as DecodedToken;
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
        const decodedToken = jwt.decode(token) as DecodedToken;
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

  const handleInputClick = (field: React.SetStateAction<string>) => {
    setActiveField(field);
  };

  const KeyPadWrite = (value: string | number) => {
    if (value === -1) {
      if (activeField === "username") {
        setUsername((prev) => prev.slice(0, -1));
      } else {
        setPassword((prev) => prev.slice(0, -1));
      }
    } else {
      if (activeField === "username") {
        setUsername((prev) => prev + value);
      } else {
        setPassword((prev) => prev + value);
      }
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
            <form onSubmit={handleSubmit} className="px-4 py-3">
              <ErrorDisplay
                error={error}
                errorDetails={errorDetails}
                onDismiss={() => {
                  setError("");
                  setErrorDetails(null);
                }}
              />
              <div className="form-outline mb-4 col-xs-3">
                <label className="form-label" htmlFor="username">
                  User name / code
                </label>
                <input
                  type="text"
                  id="username"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onClick={() => handleInputClick("username")}
                />
              </div>
              <div className="form-outline mb-4">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="form-control lg-4"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onClick={() => handleInputClick("password")}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={isSubmitting || isRedirecting}
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
          </div>

          <div className="btn-group-vertical w-100 mt-3" role="group">
            <div className="btn-group mb-2" role="group">
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(1)}
              >
                1
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(2)}
              >
                2
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(3)}
              >
                3
              </button>
            </div>
            <div className="btn-group mb-2" role="group">
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(4)}
              >
                4
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(5)}
              >
                5
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(6)}
              >
                6
              </button>
            </div>
            <div className="btn-group mb-2" role="group">
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(7)}
              >
                7
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(8)}
              >
                8
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(9)}
              >
                9
              </button>
            </div>
            <div className="btn-group mb-2" role="group">
              <button
                type="button"
                className="btn btn-outline-danger py-4"
                onClick={() => KeyPadWrite(-1)}
              >
                &lt; Backspace
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(0)}
              >
                0
              </button>
            </div>
          </div>
        </div>
        <div className="col d-flex flex-column">
          <div className="p-3 border bg-light mb-3">
            <div className="p-3 border bg-light h-100 d-flex flex-column justify-content-center align-items-center">
              <Image
                src="/images/jk-big.png"
                width={300}
                height={500}
                className="m-2"
                alt="logo"
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
