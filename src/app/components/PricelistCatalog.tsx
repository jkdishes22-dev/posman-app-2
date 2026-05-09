"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, Button, Form } from "react-bootstrap";
import { useStation } from "../contexts/StationContext";
import { Item, Pricelist, Station } from "../types/types";
import StationFilter from "./StationFilter";
import StationSwitcher from "./StationSwitcher";
import PricelistManager from "./PricelistManager";
import ExpressItemSearchModal from "./ExpressItemSearchModal";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import ErrorDisplay from "./ErrorDisplay";

interface PricelistCatalogProps {
    className?: string;
}

interface PricelistWithItems extends Pricelist {
    items: Item[];
    station?: {
        id: number;
        name: string;
    };
}

const PricelistCatalog: React.FC<PricelistCatalogProps> = ({ className = "" }) => {
    const { currentStation, availableStations, setCurrentStation } = useStation();
    const apiCall = useApiCall();
    const [pricelists, setPricelists] = useState<PricelistWithItems[]>([]);
    // filteredPricelists is now computed via useMemo below
    const [selectedPricelist, setSelectedPricelist] = useState<PricelistWithItems | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
    const [showExpressSearch, setShowExpressSearch] = useState(false);
    const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState("all");


    // Handle station filter change
    const handleStationFilterChange = (stationId: number | null) => {
        setSelectedPricelist(null); // Clear selected pricelist and items
        setSelectedStationId(stationId);
    };

    // Handle station switching (for admin/supervisor users)
    const handleStationSwitch = async (station: Station) => {
        try {
            setSelectedPricelist(null); // Clear selected pricelist and items
            setSelectedStationId(station.id);
            await setCurrentStation(station); // Actually switch the station
        } catch (error) {
            console.error("Failed to switch station:", error);
        }
    };

    // Fetch pricelists available to the current station
    useEffect(() => {
        if (!currentStation) return;

        const fetchPricelists = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await apiCall(`/api/pricelists/available?t=${Date.now()}`);

                if (result.status === 200) {
                    const pricelists = result.data?.pricelists || [];

                    // Store all station-pricelist relationships for filtering
                    setPricelists(pricelists);

                    // Pricelists are set, filtering happens automatically via useMemo
                } else if (result.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/";
                } else {
                    setError("Failed to load pricelists: " + result.error);
                    setErrorDetails(result.errorDetails);
                }
            } catch (err: any) {
                setError("Failed to load pricelists: " + err.message);
                setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPricelists();
    }, [currentStation]);

    // Memoized filtered pricelists to prevent recalculation on every render
    const filteredPricelists = useMemo(() => {
        if (pricelists.length === 0) {
            return [];
        }

        let filtered = pricelists;

        // Apply station filter
        if (selectedStationId !== null) {
            filtered = filtered.filter(pricelist =>
                pricelist.station?.id === selectedStationId
            );
        } else {
            // Show distinct pricelists when no station filter is selected
            filtered = filtered.filter((pricelist, index, self) =>
                index === self.findIndex(p => p.id === pricelist.id)
            );
        }

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(pricelist => pricelist.status === statusFilter);
        }

        return filtered;
    }, [pricelists, selectedStationId, statusFilter]);



    // Fetch items for selected pricelist
    useEffect(() => {
        if (!selectedPricelist) return;

        const fetchPricelistItems = async () => {
            try {
                const url = `/api/menu/pricelists/${selectedPricelist.id}/items?t=${Date.now()}`;

                const result = await apiCall(url);

                if (result.status === 200) {
                    setSelectedPricelist(prev => prev ? { ...prev, items: result.data } : null);
                } else {
                    setError(result.error || "Failed to fetch pricelist items");
                    setErrorDetails(result.errorDetails);
                }
            } catch (err: any) {
                setError("Network error occurred");
                setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            }
        };

        fetchPricelistItems();
    }, [selectedPricelist?.id]);


    if (isLoading) {
        return (
            <div className={`text-center p-4 ${className}`}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <div className="mt-2">Loading pricelists...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={className}>
                <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                </div>
                <ErrorDisplay
                    error={errorDetails?.message || null}
                    errorDetails={errorDetails}
                    onDismiss={() => setErrorDetails(null)}
                />
            </div>
        );
    }

    if (!currentStation) {
        return (
            <div className={`alert alert-warning ${className}`}>
                <i className="bi bi-info-circle me-2"></i>
                Please select a station to view pricelists
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Compact Header */}
            <div className="bg-primary text-white rounded p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <h4 className="mb-1 fw-bold">
                            <i className="bi bi-tags-fill me-2"></i>
                            Pricelist Catalog
                        </h4>
                        <div className="d-flex align-items-center gap-3">
                            <small className="text-white-50">
                                Current Station: <strong>{currentStation.name}</strong>
                                {process.env.NODE_ENV === "development" && (
                                    <span className="ms-2">
                                        (Stations: {availableStations.length}, Pricelists: {filteredPricelists.length}/{pricelists.length})
                                    </span>
                                )}
                            </small>
                            <StationSwitcher
                                onStationChange={handleStationSwitch}
                                showLabel={false}
                                size="sm"
                            />
                        </div>
                    </div>
                    <Button
                        variant="light"
                        size="sm"
                        onClick={() => setShowExpressSearch(true)}
                        title="Search for items across all pricelists"
                    >
                        <i className="bi bi-lightning-fill me-1 text-warning"></i>
                        Pricelist Item Quick Search
                    </Button>
                </div>
            </div>

            <Card className="mb-3 shadow-sm border-0">
                <Card.Header className="bg-light fw-bold py-2 px-3 d-flex align-items-center">
                    <i className="bi bi-funnel me-2 text-primary" aria-hidden />
                    Filters
                </Card.Header>
                <Card.Body className="py-3">
                    <Form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                        }}
                    >
                        <div className="row g-3 align-items-end">
                            <div className="col-md-4">
                                <StationFilter
                                    selectedStationId={selectedStationId}
                                    availableStations={availableStations}
                                    onStationFilterChange={handleStationFilterChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <Form.Label className="fw-semibold small mb-1 d-block">
                                    <i className="bi bi-funnel me-1 text-primary"></i>
                                    Status
                                </Form.Label>
                                <Form.Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    size="sm"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </Form.Select>
                            </div>
                            <div className="col-md-4">
                                <div className="text-muted small mb-2">
                                    <i className="bi bi-info-circle me-1"></i>
                                    {selectedStationId ? (
                                        <>
                                            Showing {filteredPricelists.length} pricelist{filteredPricelists.length !== 1 ? "s" : ""} for{" "}
                                            <strong>{availableStations.find((s) => s.id === selectedStationId)?.name}</strong>
                                        </>
                                    ) : (
                                        <>
                                            Showing all {filteredPricelists.length} pricelist{filteredPricelists.length !== 1 ? "s" : ""}
                                        </>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    size="sm"
                                    disabled={selectedStationId === null && statusFilter === "all"}
                                    onClick={() => {
                                        handleStationFilterChange(null);
                                        setStatusFilter("all");
                                    }}
                                >
                                    <i className="bi bi-x-lg me-1" aria-hidden />
                                    Clear filters
                                </Button>
                            </div>
                        </div>
                    </Form>
                </Card.Body>
            </Card>


            <PricelistManager
                pricelists={filteredPricelists}
                selectedPricelist={selectedPricelist}
                onPricelistSelect={setSelectedPricelist}
                isAdmin={false}
                highlightedItemId={highlightedItemId}
                onHighlightClear={() => setHighlightedItemId(null)}
            />

            <ExpressItemSearchModal
                show={showExpressSearch}
                onHide={() => setShowExpressSearch(false)}
                onPricelistSelect={(pricelistId, pricelistName) => {
                    setSelectedPricelist(pricelists.find(p => p.id === pricelistId) || null);
                    setShowExpressSearch(false);
                }}
                onItemSelect={(item) => {
                    // Highlight the item when navigating to pricelist
                    setHighlightedItemId(item.id);
                    setShowExpressSearch(false);
                }}
            />
        </div>
    );
};

export default PricelistCatalog;
