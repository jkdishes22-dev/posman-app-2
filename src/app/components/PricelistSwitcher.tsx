"use client";

import React, { useState, useEffect, useRef, Fragment } from "react";
import { usePricelist, Pricelist } from "../contexts/PricelistContext";
import { useAuth } from "../contexts/AuthContext";

interface PricelistSwitcherProps {
    className?: string;
    onPricelistChange?: (pricelist: Pricelist) => void;
    showLabel?: boolean;
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
}

const PricelistSwitcher: React.FC<PricelistSwitcherProps> = ({
    className = "",
    onPricelistChange,
    showLabel = true,
    size = "md",
    disabled = false
}) => {
    const { currentPricelist, availablePricelists, setCurrentPricelist, isLoading, error } = usePricelist();
    const { user } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const [pricelistError, setPricelistError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle pricelist switching with error handling
    const handlePricelistSwitch = async (pricelist: Pricelist) => {
        try {
            setPricelistError(null);
            await setCurrentPricelist(pricelist);
            onPricelistChange?.(pricelist);
            setShowDropdown(false);
        } catch (err: any) {
            setPricelistError(err.message || "Failed to switch pricelist");
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

    // Clear error when dropdown opens
    useEffect(() => {
        if (showDropdown) {
            setPricelistError(null);
        }
    }, [showDropdown]);

    // Show all available pricelists (including current one)
    const allPricelists = availablePricelists;

    // Don't show if no pricelists available
    if (!currentPricelist || availablePricelists.length === 0 || disabled) {
        return null;
    }

    const sizeClasses = {
        sm: "btn-sm",
        md: "",
        lg: "btn-lg"
    };

    const buttonSizeClass = sizeClasses[size];

    // If only one pricelist, show read-only display
    if (availablePricelists.length === 1) {
        return (
            <div className={`d-flex align-items-center ${className}`}>
                <span className={`badge bg-success ${buttonSizeClass} px-3 py-2`}>
                    <i className="bi bi-check-circle me-2"></i>
                    <strong>{currentPricelist.name}</strong>
                </span>
            </div>
        );
    }

    return (
        <div className={`position-relative ${className}`} ref={dropdownRef}>
            <style jsx>{`
                .hover-bg-light:hover {
                    background-color: #f8f9fa !important;
                }
                .dropdown-item:hover {
                    background-color: #f8f9fa !important;
                }
            `}</style>
            {/* Error Display */}
            {pricelistError && (
                <div className="alert alert-danger alert-sm mb-2" role="alert">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    {pricelistError}
                </div>
            )}

            {/* Pricelist Switcher Button */}
            <button
                className={`btn ${buttonSizeClass} ${currentPricelist ? "btn-success text-white" : "btn-outline-primary"} position-relative px-3 py-2`}
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={isLoading || disabled}
                title={currentPricelist ? `Current: ${currentPricelist.name} - Click to change` : "Choose Pricelist"}
            >
                {isLoading ? (
                    <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <strong>Loading...</strong>
                    </>
                ) : (
                    <>
                        <i className={`bi ${currentPricelist ? "bi-arrow-repeat" : "bi-list-ul"} me-2`}></i>
                        <span className="fw-semibold">
                            {currentPricelist ? "Switch Pricelist" : "Choose Pricelist"}
                        </span>
                        <span className="ms-2">▼</span>
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="dropdown-menu show position-absolute top-100 start-0 mt-1 shadow" style={{ minWidth: "250px", zIndex: 1050 }}>
                    {allPricelists.map((pricelist, index) => (
                        <Fragment key={pricelist.id}>
                            {index > 0 && <div className="dropdown-divider"></div>}
                            <button
                                className={`dropdown-item d-flex align-items-center py-3 px-3 hover-bg-light ${currentPricelist && currentPricelist.id === pricelist.id ? "bg-light" : ""
                                    }`}
                                onClick={() => handlePricelistSwitch(pricelist)}
                                disabled={isLoading}
                            >
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center mb-1">
                                        <div className={`fw-bold ${currentPricelist && currentPricelist.id === pricelist.id ? "text-success" : "text-dark"}`}>
                                            {pricelist.name}
                                        </div>
                                        {currentPricelist && currentPricelist.id === pricelist.id && (
                                            <span className="badge bg-success ms-2">In Use</span>
                                        )}

                                    </div>
                                </div>
                                {currentPricelist && currentPricelist.id === pricelist.id ? (
                                    <i className="bi bi-check-circle text-success fs-5"></i>
                                ) : (
                                    <i className="bi bi-arrow-right text-muted fs-5"></i>
                                )}
                            </button>
                        </Fragment>
                    ))}

                    {allPricelists.length === 0 && (
                        <div className="dropdown-item text-muted text-center py-3">
                            <i className="bi bi-info-circle me-1"></i>
                            No pricelists available
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PricelistSwitcher;
