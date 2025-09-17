"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import Image from "next/image";
import jwt from "jsonwebtoken";
import { DecodedToken } from "./components/SecureRoute";
import { useAuth } from "./contexts/AuthContext";
import { useApiCall } from "./utils/apiUtils";
import { standardizeApiError, ApiErrorResponse } from "./utils/errorUtils";
import ErrorDisplay from "./components/ErrorDisplay";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [activeField, setActiveField] = useState("username");
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const apiCall = useApiCall();

  // Reusable function for role-based routing
  const redirectBasedOnRole = (decodedToken: DecodedToken | null, fallbackRole?: string) => {
    const primaryRole = decodedToken?.roles?.[0] || fallbackRole;
    let targetPath = "/home"; // default

    if (primaryRole === "admin") {
      targetPath = "/admin";
    } else if (primaryRole === "supervisor") {
      targetPath = "/supervisor";
    } else if (primaryRole === "sales") {
      targetPath = "/sales";
    } else if (primaryRole === "cashier") {
      targetPath = "/home/cashier";
    } else if (primaryRole === "storekeeper") {
      targetPath = "/storekeeper";
    } else {
      targetPath = "/home";
    }

    // Try router.push first
    router.push(targetPath);

    // Fallback: if router.push doesn't work, use window.location after a short delay
    setTimeout(() => {
      if (window.location.pathname === "/") {
        window.location.href = targetPath;
      }
    }, 100);
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decodedToken = jwt.decode(token) as DecodedToken;
          if (decodedToken && decodedToken.roles && decodedToken.roles.length > 0) {
            redirectBasedOnRole(decodedToken);
          }
        } catch (error) {
          console.error("Error decoding token:", error);
        }
      }
    }
  }, [isAuthenticated, isLoading]);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields");
      setErrorDetails(null);
      return;
    }

    const formData = { username, password };

    try {
      const result = await apiCall("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (result.status === 200 && result.data) {
        const { token, role } = result.data;
        const decodedToken = jwt.decode(token) as DecodedToken;
        const userData = decodedToken && decodedToken.user ? decodedToken.user : null;

        // Use the auth context to handle login
        login(token, userData);

        // Use the reusable function for role-based routing
        redirectBasedOnRole(decodedToken, role);
      } else {
        // Handle API error response - use ambiguous message for login failures
        setError("Invalid credentials. Please check your username and password.");
        setErrorDetails({
          message: "Invalid credentials. Please check your username and password.",
          status: result.status || 401,
          isLoginError: true
        });
      }
    } catch (err) {
      const standardizedError = standardizeApiError(err, 0);
      setError(standardizedError.message);
      setErrorDetails(standardizedError.details);
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
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
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
              {error && (
                <ErrorDisplay
                  error={error}
                  errorDetails={errorDetails}
                  onDismiss={() => {
                    setError(null);
                    setErrorDetails(null);
                  }}
                />
              )}
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
              <button type="submit" className="btn btn-primary btn-block">
                Sign in
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
