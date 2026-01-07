"use client";

import React from "react";
import { Badge, Card } from "react-bootstrap";
import { useStation } from "../contexts/StationContext";

interface StationStatusProps {
    className?: string;
    variant?: "compact" | "detailed" | "minimal";
}

const StationStatus: React.FC<StationStatusProps> = ({
    className = "",
    variant = "compact"
}) => {
    const { currentStation, availableStations, isLoading, error } = useStation();

    if (isLoading) {
        return (
            <div className={`d-flex align-items-center ${className}`}>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <span className="text-muted">Loading station...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={className}>
                <Badge bg="danger" className="d-flex align-items-center">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Station Error
                </Badge>
            </div>
        );
    }

    if (!currentStation) {
        return (
            <div className={className}>
                <Badge bg="warning" className="d-flex align-items-center">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    No Station Selected
                </Badge>
            </div>
        );
    }

    if (variant === "minimal") {
        return (
            <div className={`d-flex align-items-center ${className}`}>
                <Badge bg="success" className="d-flex align-items-center small">
                    <i className="bi bi-geo-alt me-1"></i>
                    {currentStation.name}
                </Badge>
            </div>
        );
    }

    if (variant === "compact") {
        return (
            <div className={`d-flex align-items-center ${className}`}>
                <Badge bg="success" className="d-flex align-items-center me-1 small">
                    <i className="bi bi-geo-alt me-1"></i>
                    {currentStation.name}
                </Badge>
                {availableStations.length > 1 && (
                    <small className="text-muted">
                        ({availableStations.length} available)
                    </small>
                )}
            </div>
        );
    }

    return (
        <Card className={`border-0 bg-light ${className}`}>
            <Card.Body className="py-1 px-2">
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <i className="bi bi-geo-alt text-success me-1"></i>
                        <div>
                            <div className="fw-semibold text-dark small">{currentStation.name}</div>
                            <small className="text-muted">Current Station</small>
                        </div>
                    </div>
                    <Badge bg="success" className="d-flex align-items-center small">
                        <i className="bi bi-check-circle me-1"></i>
                        Active
                    </Badge>
                </div>
                {availableStations.length > 1 && (
                    <div className="mt-1">
                        <small className="text-muted">
                            {availableStations.length - 1} other station{availableStations.length - 1 !== 1 ? "s" : ""} available
                        </small>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default StationStatus;
