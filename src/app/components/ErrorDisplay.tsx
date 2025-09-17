import React from 'react';
import { Alert, Collapse } from 'react-bootstrap';
import { useState } from 'react';

interface ErrorDisplayProps {
    error: string | null;
    variant?: 'danger' | 'warning' | 'info';
    dismissible?: boolean;
    onDismiss?: () => void;
    className?: string;
    errorDetails?: {
        missingPermissions?: string[];
        isAdmin?: boolean;
        userRoles?: string[];
        requiredPermissions?: string[];
        status?: number;
        networkError?: boolean;
        isLoginError?: boolean;
    };
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    error,
    variant,
    dismissible = true,
    onDismiss,
    className = '',
    errorDetails
}) => {
    const [showDetails, setShowDetails] = useState(false);

    if (!error) return null;

    // Intelligent error type detection based on status and error details
    const getErrorType = () => {
        if (errorDetails?.isLoginError) return 'loginError';
        if (errorDetails?.networkError) return 'network';
        if (errorDetails?.status === 401) return 'unauthorized';
        if (errorDetails?.status === 403) return 'forbidden';
        if (errorDetails?.status === 404) return 'notFound';
        if (errorDetails?.status === 500) return 'serverError';
        if (errorDetails?.status && errorDetails.status >= 400) return 'clientError';
        return 'generic';
    };

    const getErrorTitle = () => {
        const errorType = getErrorType();
        switch (errorType) {
            case 'loginError': return 'Login Failed';
            case 'network': return 'Connection Error';
            case 'unauthorized': return 'Authentication Required';
            case 'forbidden': return 'Access Denied';
            case 'notFound': return 'Not Found';
            case 'serverError': return 'Server Error';
            case 'clientError': return 'Request Error';
            default: return 'Error';
        }
    };

    const getErrorVariant = () => {
        if (variant) return variant; // Use explicit variant if provided
        const errorType = getErrorType();
        switch (errorType) {
            case 'loginError': return 'danger';
            case 'network': return 'warning';
            case 'unauthorized': return 'info';
            case 'forbidden': return 'danger';
            case 'notFound': return 'warning';
            case 'serverError': return 'danger';
            case 'clientError': return 'warning';
            default: return 'danger';
        }
    };

    const isPermissionError = error.includes('Missing permissions') || error.includes('Forbidden') || errorDetails?.status === 403;
    const hasAdminDetails = errorDetails?.isAdmin && errorDetails?.missingPermissions;
    const finalVariant = getErrorVariant();
    const errorTitle = getErrorTitle();

    return (
        <Alert
            variant={finalVariant}
            dismissible={dismissible}
            onClose={onDismiss}
            className={`mb-3 ${className}`}
        >
            <Alert.Heading>
                {errorTitle}
            </Alert.Heading>
            <p className="mb-0">{error}</p>


            {/* Network Error Template */}
            {errorDetails?.networkError && (
                <div className="mt-3">
                    <div className="alert alert-info mb-0">
                        <small>
                            <strong>💡 Connection Tip:</strong> Please check your internet connection and try again.
                            If the problem persists, contact your system administrator.
                        </small>
                    </div>
                </div>
            )}


            {/* 404 Not Found Template */}
            {errorDetails?.status === 404 && !errorDetails?.networkError && (
                <div className="mt-3">
                    <div className="alert alert-warning mb-0">
                        <small>
                            <strong>🔍 Not Found:</strong> The requested resource could not be found.
                            Please check the URL or contact support if this persists.
                        </small>
                    </div>
                </div>
            )}

            {/* 500 Server Error Template */}
            {errorDetails?.status === 500 && !errorDetails?.networkError && (
                <div className="mt-3">
                    <div className="alert alert-danger mb-0">
                        <small>
                            <strong>⚠️ Server Error:</strong> An internal server error occurred.
                            Please try again later or contact support if the problem persists.
                        </small>
                    </div>
                </div>
            )}

            {/* Permission Error Template */}
            {isPermissionError && hasAdminDetails && (
                <div className="mt-3">
                    <button
                        className="btn btn-light btn-sm shadow-1 fw-medium"
                        type="button"
                        onClick={() => setShowDetails(!showDetails)}
                        aria-expanded={showDetails}
                    >
                        <i className={`bi bi-chevron-down me-1 ${showDetails ? 'rotate-180' : ''}`}></i>
                        {showDetails ? 'Hide' : 'Show'} Permission Details
                    </button>

                    <Collapse in={showDetails}>
                        <div className="mt-3">
                            <div className="bg-dark text-light rounded p-3 shadow-2">
                                <h6 className="text-warning mb-3 fw-medium">
                                    <i className="bi bi-shield-lock me-2"></i>
                                    Permission Details (Admin View)
                                </h6>

                                <div className="mb-3">
                                    <strong className="text-info d-block mb-2">Your Current Roles:</strong>
                                    <div className="d-flex flex-wrap gap-1">
                                        {errorDetails.userRoles?.map((role, index) => (
                                            <span key={index} className="badge bg-primary">
                                                {role}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <strong className="text-danger d-block mb-2">Missing Permissions:</strong>
                                    <div className="d-flex flex-wrap gap-1">
                                        {errorDetails.missingPermissions?.map((permission, index) => (
                                            <span key={index} className="badge bg-danger">
                                                {permission}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <strong className="text-warning d-block mb-2">Required Permissions:</strong>
                                    <div className="d-flex flex-wrap gap-1">
                                        {errorDetails.requiredPermissions?.map((permission, index) => (
                                            <span key={index} className="badge bg-warning text-dark">
                                                {permission}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="alert alert-warning mb-0">
                                    <small>
                                        <strong>💡 Admin Tip:</strong> To grant these permissions, go to
                                        <strong> Users → Roles → Permissions</strong> and assign the missing permissions
                                        to the appropriate role(s).
                                    </small>
                                </div>
                            </div>
                        </div>
                    </Collapse>
                </div>
            )}
        </Alert>
    );
};

export default ErrorDisplay;
