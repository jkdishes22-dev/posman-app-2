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
    };
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    error,
    variant = 'danger',
    dismissible = true,
    onDismiss,
    className = '',
    errorDetails
}) => {
    const [showDetails, setShowDetails] = useState(false);

    if (!error) return null;

    const isPermissionError = error.includes('Missing permissions') || error.includes('Forbidden');
    const hasAdminDetails = errorDetails?.isAdmin && errorDetails?.missingPermissions;

    return (
        <Alert
            variant={variant}
            dismissible={dismissible}
            onClose={onDismiss}
            className={`mb-3 ${className}`}
        >
            <Alert.Heading>
                {variant === 'danger' && 'Error'}
                {variant === 'warning' && 'Warning'}
                {variant === 'info' && 'Information'}
            </Alert.Heading>
            <p className="mb-0">{error}</p>

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
