"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStation } from "../contexts/StationContext";
import { useAuth } from "../contexts/AuthContext";
import { Station } from "../types/types";

interface StationSwitcherProps {
    className?: string;
    onStationChange?: (station: Station) => void;
    showLabel?: boolean;
    size?: "sm" | "md" | "lg";
    /** Bootstrap button variant for the trigger button, e.g. "outline-light" on dark backgrounds */
    buttonVariant?: string;
    /** When true, any authenticated user with assigned stations can switch (e.g. on billing page) */
    allowAllUsers?: boolean;
}

const StationSwitcher: React.FC<StationSwitcherProps> = ({
    className = "",
    onStationChange,
    showLabel = true,
    size = "md",
    buttonVariant = "outline-primary",
    allowAllUsers = false,
}) => {
    const { currentStation, availableStations, setCurrentStation } = useStation();
    const { user } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const [stationError, setStationError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const canSwitchStations = allowAllUsers || user?.roles?.some(role =>
        role.name === "admin" || role.name === "supervisor"
    ) || false;

    // Handle station switching with error handling
    const handleStationSwitch = async (station: Station) => {
        try {
            setStationError(null);
            await setCurrentStation(station);
            onStationChange?.(station);
            setShowDropdown(false);
        } catch (err: any) {
            console.error("Station switch error:", err);
            setStationError(err.message || "Failed to switch station");
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showDropdown]);

    // Don't show if user doesn't have permission to switch stations
    if (!canSwitchStations) {
        return null;
    }

    const sizeClasses = {
        sm: "btn-sm",
        md: "",
        lg: "btn-lg"
    };

    if (!currentStation) return null;

    if (availableStations.length <= 1) {
        return (
            <span className={`badge bg-secondary ${sizeClasses[size]} ${className}`}>
                <i className="bi bi-geo-alt me-1"></i>
                {currentStation.name}
            </span>
        );
    }

    return (
        <div className={`dropdown ${className}`} ref={dropdownRef}>
            {showLabel && (
                <label className="form-label fw-semibold mb-2">
                    <i className="bi bi-geo-alt me-2 text-primary"></i>
                    Current Station
                </label>
            )}
            <button
                className={`btn btn-${buttonVariant} dropdown-toggle ${sizeClasses[size]} page-header-strip-profile-btn`}
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                aria-expanded={showDropdown}
            >
                <i className="bi bi-geo-alt me-1"></i>
                {currentStation.name}
            </button>
            {showDropdown && (
                <ul className="dropdown-menu show">
                    {availableStations.map((station) => (
                        <li key={station.id}>
                            <button
                                className={`dropdown-item ${currentStation?.id === station.id ? "active" : ""}`}
                                onClick={() => handleStationSwitch(station)}
                            >
                                <i className="bi bi-geo-alt me-2"></i>
                                {station.name}
                                {currentStation?.id === station.id && (
                                    <i className="bi bi-check ms-2"></i>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {stationError && (
                <div className="alert alert-warning alert-dismissible fade show mt-2" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {stationError}
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setStationError(null)}
                        aria-label="Close"
                    ></button>
                </div>
            )}
        </div>
    );
};

export default StationSwitcher;
