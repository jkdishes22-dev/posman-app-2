"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MaterialButton, MaterialCard } from "../components/MaterialComponents";

const NotAuthorizedPage = () => {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/");
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <MaterialCard className="text-center shadow-3">
              {/* Icon */}
              <div className="mb-4">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10"
                  style={{ width: '80px', height: '80px' }}>
                  <i className="bi bi-shield-exclamation text-danger" style={{ fontSize: '2.5rem' }}></i>
                </div>
              </div>

              {/* Title */}
              <h1 className="fw-bold text-dark mb-3" style={{ fontSize: '2.5rem' }}>
                Access Denied
              </h1>

              {/* Description */}
              <p className="text-secondary mb-4 fs-5">
                You don't have permission to view this page. Please contact your administrator if you believe this is an error.
              </p>

              {/* Additional Info */}
              <div className="alert alert-info border-0 shadow-1 mb-4">
                <div className="d-flex align-items-center">
                  <i className="bi bi-info-circle me-2 text-info"></i>
                  <small className="mb-0">
                    <strong>Need help?</strong> Check your permissions or contact support for assistance.
                  </small>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                <MaterialButton
                  variant="primary"
                  onClick={handleLogin}
                  className="px-4 py-2"
                >
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Login Instead
                </MaterialButton>

                <MaterialButton
                  variant="secondary"
                  onClick={handleGoBack}
                  className="px-4 py-2"
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Go Back
                </MaterialButton>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-top">
                <p className="text-muted small mb-0">
                  <i className="bi bi-shield-check me-1"></i>
                  Secure access required • POS Management System
                </p>
              </div>
            </MaterialCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotAuthorizedPage;
