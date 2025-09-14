"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Form } from "react-bootstrap";
import { useStation } from "../contexts/StationContext";
import { Item, Pricelist, Station } from "../types/types";
import StationFilter from "./StationFilter";
import PricelistManager from "./PricelistManager";
import ExpressItemSearchModal from "./ExpressItemSearchModal";

interface PricelistCatalogProps {
    className?: string;
}

interface PricelistWithItems extends Pricelist {
    items: Item[];
    station_id?: number;
    station_name?: string;
}

const PricelistCatalog: React.FC<PricelistCatalogProps> = ({ className = "" }) => {
    const { currentStation, availableStations } = useStation();
    const [pricelists, setPricelists] = useState<PricelistWithItems[]>([]);
    const [filteredPricelists, setFilteredPricelists] = useState<PricelistWithItems[]>([]);
    const [selectedPricelist, setSelectedPricelist] = useState<PricelistWithItems | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
    const [showExpressSearch, setShowExpressSearch] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");


    // Handle station filter change
    const handleStationFilterChange = (stationId: number | null) => {
        setSelectedPricelist(null); // Clear selected pricelist and items
        setSelectedStationId(stationId);
    };

    // Fetch pricelists available to the current station
    useEffect(() => {
        if (!currentStation) return;

        const fetchPricelists = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem("token");
                const response = await fetch("/api/pricelists/available", {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log("API returned:", data.length, "pricelists");

                    // Store all station-pricelist relationships for filtering
                    setPricelists(data);

                    // Initially show distinct pricelists (no filter applied)
                    const distinctPricelists = data.filter((pricelist, index, self) =>
                        index === self.findIndex(p => p.id === pricelist.id)
                    );
                    console.log("Distinct pricelists:", distinctPricelists.length);
                    setFilteredPricelists(distinctPricelists);
                } else if (response.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/";
                } else {
                    setError("Failed to load pricelists");
                }
            } catch (err: any) {
                setError("Failed to load pricelists: " + err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPricelists();
    }, [currentStation]);

    // Filter pricelists when station filter or status filter changes
    useEffect(() => {
        console.log("Filter effect running:", {
            pricelistsLength: pricelists.length,
            selectedStationId,
            statusFilter
        });

        if (pricelists.length === 0) {
            console.log("No pricelists, skipping filter");
            return;
        }

        let filtered = pricelists;

        // Apply station filter
        if (selectedStationId !== null) {
            filtered = filtered.filter(pricelist =>
                pricelist.station_id === selectedStationId
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

        console.log("Final filtered result:", filtered.length, "pricelists");
        setFilteredPricelists(filtered);
    }, [selectedStationId, pricelists, statusFilter]);



    // Fetch items for selected pricelist
    useEffect(() => {
        if (!selectedPricelist) return;

        const fetchPricelistItems = async () => {
            try {
                const token = localStorage.getItem("token");
                const url = `/api/menu/pricelists/${selectedPricelist.id}/items?t=${Date.now()}`;

                const response = await fetch(url, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "Cache-Control": "no-cache",
                    },
                });

                if (response.ok) {
                    const items = await response.json();
                    setSelectedPricelist(prev => prev ? { ...prev, items } : null);
                }
            } catch (err: any) {
                // Silent error handling for better UX
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
            <div className={`alert alert-danger ${className}`}>
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
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
            <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0">
                        <i className="bi bi-tags me-2"></i>
                        Pricelist Catalog
                    </h4>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setShowExpressSearch(true)}
                        title="Search for items across all pricelists"
                    >
                        <i className="bi bi-lightning me-1"></i>
                        Pricelist Item Quick Search
                    </Button>
                </div>
                <div className="text-muted small">
                    Current Station: <strong>{currentStation.name}</strong>
                    {process.env.NODE_ENV === "development" && (
                        <span className="ms-3">
                            (Stations: {availableStations.length}, Pricelists: {filteredPricelists.length}/{pricelists.length})
                        </span>
                    )}
                </div>
            </div>

            {/* Station Filter */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-md-3">
                            <StationFilter
                                selectedStationId={selectedStationId}
                                availableStations={availableStations}
                                onStationFilterChange={handleStationFilterChange}
                            />
                        </div>
                        <div className="col-md-3">
                            <Form.Label className="fw-semibold small">
                                <i className="bi bi-funnel me-1 text-primary"></i>
                                Status Filter
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
                        <div className="col-md-6">
                            <div className="d-flex align-items-center gap-3">
                                <div className="text-muted">
                                    <i className="bi bi-info-circle me-1"></i>
                                    {selectedStationId ? (
                                        <>
                                            Showing {filteredPricelists.length} pricelist{filteredPricelists.length !== 1 ? "s" : ""} for <strong>{availableStations.find(s => s.id === selectedStationId)?.name}</strong>
                                        </>
                                    ) : (
                                        <>
                                            Showing all {filteredPricelists.length} pricelist{filteredPricelists.length !== 1 ? "s" : ""}
                                        </>
                                    )}
                                </div>
                                {(selectedStationId || statusFilter !== "all") && (
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => {
                                            handleStationFilterChange(null);
                                            setStatusFilter("all");
                                        }}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Clear Filters
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <PricelistManager
                pricelists={filteredPricelists}
                selectedPricelist={selectedPricelist}
                onPricelistSelect={setSelectedPricelist}
                isAdmin={false}
            />

            <ExpressItemSearchModal
                show={showExpressSearch}
                onHide={() => setShowExpressSearch(false)}
                onPricelistSelect={(pricelistId, pricelistName) => {
                    console.log("Express search selected pricelist:", pricelistId, pricelistName);
                    setSelectedPricelist(pricelists.find(p => p.id === pricelistId) || null);
                    setShowExpressSearch(false);
                }}
                onItemSelect={(item) => {
                    console.log("Express search selected item:", item);
                    // You can add logic here to show the item in the current view
                }}
            />
        </div>
    );
};

export default PricelistCatalog;
