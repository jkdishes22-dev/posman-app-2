"use client";

import React, { useState } from "react";
import { Form, Alert, Spinner } from "react-bootstrap";
import AppSelect from "./AppSelect";
import { useStation } from "../contexts/StationContext";
import { useAuth } from "../contexts/AuthContext";
import { Station } from "../types/types";

interface StationSelectorProps {
    className?: string;
    showLabel?: boolean;
    size?: "sm" | "lg";
    disabled?: boolean;
    /** When true, any authenticated user with assigned stations can switch (e.g. on billing page) */
    allowAllUsers?: boolean;
}

const StationSelector: React.FC<StationSelectorProps> = ({
    className = "",
    showLabel = true,
    size = "sm",
    disabled = false,
    allowAllUsers = false,
}) => {
    const {
        currentStation,
        availableStations,
        isLoading,
        error,
        setCurrentStation
    } = useStation();
    const { user } = useAuth();

    const [isChanging, setIsChanging] = useState(false);

    const canSwitchStations = allowAllUsers || user?.roles?.some(role =>
        role.name === "admin" || role.name === "supervisor"
    ) || false;

    const handleStationChange = async (value: string) => {
        const stationId = parseInt(value);
        if (!stationId) {
            await setCurrentStation(null);
            return;
        }

        const selectedStation = availableStations.find(station => station.id === stationId);
        if (!selectedStation) {
            return;
        }

        setIsChanging(true);
        try {
            await setCurrentStation(selectedStation);
        } catch (error: any) {
            console.error("Error changing station:", error);
            // Optionally show error to user
        } finally {
            setIsChanging(false);
        }
    };

    // Don't show if user doesn't have permission to switch stations
    if (!canSwitchStations) {
        return null;
    }

    if (isLoading) {
        return (
            <div className={`d-flex align-items-center ${className}`}>
                {showLabel && <Form.Label className="me-2 mb-0">Station:</Form.Label>}
                <Spinner animation="border" size="sm" className="me-2" />
                <span className="text-muted">Loading stations...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className={className}>
                <Alert.Heading className="h6">Station Error</Alert.Heading>
                <p className="mb-0">{error}</p>
            </Alert>
        );
    }

    if (availableStations.length === 0) {
        return (
            <Alert variant="warning" className={className}>
                <Alert.Heading className="h6">No Stations Available</Alert.Heading>
                <p className="mb-0">You haven't been assigned to any stations. Please contact your administrator.</p>
            </Alert>
        );
    }

    return (
        <div className={className}>
            <Form.Group>
                <AppSelect
                    size={size === "sm" ? "sm" : undefined}
                    className="border-2"
                    options={availableStations.map((s: Station) => ({ value: String(s.id), label: s.name }))}
                    value={currentStation ? String(currentStation.id) : ""}
                    onChange={handleStationChange}
                    placeholder="Choose a station..."
                    isDisabled={disabled || isChanging}
                />
            </Form.Group>
        </div>
    );
};

export default StationSelector;
