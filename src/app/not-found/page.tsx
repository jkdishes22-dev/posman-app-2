"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MaterialButton, MaterialCard } from "../components/MaterialComponents";

const NotFoundPage = () => {
    const router = useRouter();

    const handleGoHome = () => {
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
                                <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-warning bg-opacity-10"
                                    style={{ width: '80px', height: '80px' }}>
                                    <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '2.5rem' }}></i>
                                </div>
                            </div>

                            {/* Error Code */}
                            <div className="mb-3">
                                <h1 className="fw-bold text-dark mb-0" style={{ fontSize: '4rem', lineHeight: '1' }}>
                                    404
                                </h1>
                                <div className="text-primary fw-medium">Page Not Found</div>
                            </div>

                            {/* Description */}
                            <p className="text-secondary mb-4 fs-5">
                                The page you're looking for doesn't exist or has been moved. Let's get you back on track.
                            </p>

                            {/* Additional Info */}
                            <div className="alert alert-warning border-0 shadow-1 mb-4">
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-lightbulb me-2 text-warning"></i>
                                    <small className="mb-0">
                                        <strong>Tip:</strong> Check the URL or use the navigation menu to find what you're looking for.
                                    </small>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                                <MaterialButton
                                    variant="primary"
                                    onClick={handleGoHome}
                                    className="px-4 py-2"
                                >
                                    <i className="bi bi-house me-2"></i>
                                    Go Home
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
                                    <i className="bi bi-search me-1"></i>
                                    Can't find what you're looking for? • Contact Support
                                </p>
                            </div>
                        </MaterialCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
