"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { useStation } from '../contexts/StationContext';
import { Item, Pricelist, Station } from '../types/types';
import ViewItems from '../admin/menu/category/components/items/items-view';

interface PricelistCatalogProps {
    className?: string;
}

interface PricelistWithItems extends Pricelist {
    items: Item[];
}

const PricelistCatalog: React.FC<PricelistCatalogProps> = ({ className = '' }) => {
    const { currentStation, availableStations, setCurrentStation } = useStation();
    const [pricelists, setPricelists] = useState<PricelistWithItems[]>([]);
    const [filteredPricelists, setFilteredPricelists] = useState<PricelistWithItems[]>([]);
    const [selectedPricelist, setSelectedPricelist] = useState<PricelistWithItems | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stationError, setStationError] = useState<string | null>(null);
    const [showStationDropdown, setShowStationDropdown] = useState(false);
    const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle station switching with error handling
    const handleStationSwitch = async (station: Station) => {
        try {
            setStationError(null);
            await setCurrentStation(station);
            setSelectedPricelist(null); // Clear selected pricelist when switching stations
        } catch (err: any) {
            console.error("Station switch error:", err);
            setStationError(err.message || "Failed to switch station");
        }
    };

    // Handle station filter change
    const handleStationFilterChange = (stationId: string) => {
        if (stationId === "") {
            setSelectedStationId(null);
        } else {
            setSelectedStationId(Number(stationId));
        }
    };

    // Fetch pricelists available to the current station
    useEffect(() => {
        if (!currentStation) return;

        const fetchPricelists = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`/api/pricelists/available?stationId=${currentStation.id}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('Raw pricelists from API:', data);

                    // Deduplicate pricelists by ID on frontend as well
                    const uniquePricelists = data.filter((pricelist: any, index: number, self: any[]) =>
                        index === self.findIndex(p => p.id === pricelist.id)
                    );

                    console.log('Deduplicated pricelists:', uniquePricelists);
                    console.log(`Total pricelists after deduplication: ${uniquePricelists.length}`);
                    setPricelists(uniquePricelists);
                    setFilteredPricelists(uniquePricelists);
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

    // Filter pricelists when station filter changes
    useEffect(() => {
        if (selectedStationId === null) {
            // Show all pricelists when no filter is selected
            setFilteredPricelists(pricelists);
        } else {
            // Filter pricelists by selected station
            const filtered = pricelists.filter(pricelist =>
                pricelist.station_id === selectedStationId
            );
            setFilteredPricelists(filtered);
        }
    }, [selectedStationId, pricelists]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowStationDropdown(false);
            }
        };

        if (showStationDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showStationDropdown]);

    // Fetch items for selected pricelist
    useEffect(() => {
        if (!selectedPricelist) return;

        const fetchPricelistItems = async () => {
            try {
                const token = localStorage.getItem("token");
                const url = `/api/menu/pricelists/${selectedPricelist.id}/items?t=${Date.now()}`;
                console.log(`Fetching items for pricelist ${selectedPricelist.id}:`, url);

                const response = await fetch(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache',
                    },
                });

                console.log(`Response status for pricelist ${selectedPricelist.id}:`, response.status);

                if (response.ok) {
                    const items = await response.json();
                    console.log(`Loaded ${items.length} items for pricelist ${selectedPricelist.id}:`, items);
                    setSelectedPricelist(prev => prev ? { ...prev, items } : null);
                } else {
                    console.error(`Failed to fetch items for pricelist ${selectedPricelist.id}:`, response.status);
                }
            } catch (err: any) {
                console.error("Failed to fetch pricelist items:", err);
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
                    {availableStations.length > 1 ? (
                        <div className="dropdown" ref={dropdownRef}>
                            <button
                                className="btn btn-outline-primary btn-sm dropdown-toggle"
                                type="button"
                                onClick={() => setShowStationDropdown(!showStationDropdown)}
                                aria-expanded={showStationDropdown}
                            >
                                <i className="bi bi-geo-alt me-1"></i>
                                {currentStation.name}
                            </button>
                            {showStationDropdown && (
                                <ul className="dropdown-menu show">
                                    {availableStations.map((station) => (
                                        <li key={station.id}>
                                            <button
                                                className={`dropdown-item ${currentStation?.id === station.id ? 'active' : ''}`}
                                                onClick={() => {
                                                    handleStationSwitch(station);
                                                    setShowStationDropdown(false);
                                                }}
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
                        </div>
                    ) : null}
                </div>
                <div className="text-muted small">
                    Current Station: <strong>{currentStation.name}</strong>
                    {process.env.NODE_ENV === 'development' && (
                        <span className="ms-3">
                            (Stations: {availableStations.length}, Pricelists: {filteredPricelists.length}/{pricelists.length})
                        </span>
                    )}
                </div>
            </div>

            {stationError && (
                <div className="alert alert-warning alert-dismissible fade show" role="alert">
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

            {/* Station Filter */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">
                                <i className="bi bi-funnel me-2 text-primary"></i>
                                Filter by Station
                            </label>
                            <select
                                className="form-select form-select-lg"
                                value={selectedStationId || ""}
                                onChange={(e) => handleStationFilterChange(e.target.value)}
                            >
                                <option value="">All Stations</option>
                                {availableStations.map((station) => (
                                    <option key={station.id} value={station.id}>
                                        {station.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-8">
                            <div className="d-flex align-items-center gap-3">
                                <div className="text-muted">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Showing {filteredPricelists.length} pricelist{filteredPricelists.length !== 1 ? 's' : ''}
                                    {selectedStationId && (
                                        <span className="ms-2">
                                            for <strong>{availableStations.find(s => s.id === selectedStationId)?.name}</strong>
                                        </span>
                                    )}
                                </div>
                                {selectedStationId && (
                                    <button
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => setSelectedStationId(null)}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Clear Filter
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Row>
                <Col md={4}>
                    <Card>
                        <Card.Header>
                            <h6 className="mb-0">Available Pricelists</h6>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {filteredPricelists.length === 0 ? (
                                <div className="p-3 text-muted text-center">
                                    {selectedStationId ?
                                        `No pricelists available for ${availableStations.find(s => s.id === selectedStationId)?.name}` :
                                        'No pricelists available'
                                    }
                                </div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {filteredPricelists.map((pricelist, index) => (
                                        <button
                                            key={`${pricelist.id}-${index}`}
                                            className={`list-group-item list-group-item-action ${selectedPricelist?.id === pricelist.id ? 'active' : ''
                                                }`}
                                            onClick={() => setSelectedPricelist(pricelist)}
                                        >
                                            <div className="fw-bold">{pricelist.name}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={8}>
                    <Card>
                        <Card.Header>
                            <h6 className="mb-0">
                                {selectedPricelist ? selectedPricelist.name : 'Select a Pricelist'}
                            </h6>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {!selectedPricelist ? (
                                <div className="text-center text-muted p-4">
                                    <i className="bi bi-arrow-left me-2"></i>
                                    Select a pricelist to view items
                                </div>
                            ) : (
                                <ViewItems
                                    selectedCategory={null}
                                    items={selectedPricelist.items || []}
                                    pricelistItems={selectedPricelist.items || []}
                                    itemError=""
                                    setItems={() => { }} // Read-only, no need to update
                                    isBillingSection={false}
                                    isPricelistSection={true}
                                    isCategoryItemsSection={false}
                                    onItemPick={() => { }} // Read-only, no picking
                                />
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default PricelistCatalog;
