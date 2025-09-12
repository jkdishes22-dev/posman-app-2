"use client";

import React from "react";
import { MaterialCard } from "../components/MaterialComponents";

const LoadingPage = () => {
    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-12 col-md-6 col-lg-4">
                        <MaterialCard className="text-center shadow-2">
                            {/* Loading Icon */}
                            <div className="mb-4">
                                <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10"
                                    style={{ width: '80px', height: '80px' }}>
                                    <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </div>

                            {/* Loading Text */}
                            <h4 className="fw-medium text-dark mb-3">
                                Loading...
                            </h4>

                            <p className="text-secondary mb-4">
                                Please wait while we prepare your dashboard.
                            </p>

                            {/* Progress Bar */}
                            <div className="progress mb-4" style={{ height: '4px' }}>
                                <div
                                    className="progress-bar bg-primary"
                                    role="progressbar"
                                    style={{ width: '100%' }}
                                    aria-valuenow="100"
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                >
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-4 pt-3 border-top">
                                <p className="text-muted small mb-0">
                                    <i className="bi bi-hourglass-split me-1"></i>
                                    Initializing POS Management System
                                </p>
                            </div>
                        </MaterialCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingPage;
