"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Station } from '../types/types';

interface StationContextType {
    currentStation: Station | null;
    availableStations: Station[];
    isLoading: boolean;
    error: string | null;
    setCurrentStation: (station: Station | null) => void;
    refreshStations: () => Promise<void>;
    validateStationAccess: (stationId: number) => Promise<boolean>;
    loadStationsIfNeeded: () => Promise<void>;
}

const StationContext = createContext<StationContextType | undefined>(undefined);

interface StationProviderProps {
    children: ReactNode;
}

export const StationProvider: React.FC<StationProviderProps> = ({ children }) => {
    const [currentStation, setCurrentStation] = useState<Station | null>(null);
    const [availableStations, setAvailableStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch user's available stations
    const fetchUserStations = async (): Promise<Station[]> => {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("No authentication token found");
        }

        const response = await fetch("/api/users/me/stations", {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch stations: ${response.statusText}`);
        }

        const data = await response.json();
        return data.stations || [];
    };

    // Get user's default station
    const fetchDefaultStation = async (): Promise<Station | null> => {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("No authentication token found");
        }

        const response = await fetch("/api/users/me/default-station", {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            if (response.status === 404) {
                return null; // No default station set
            }
            throw new Error(`Failed to fetch default station: ${response.statusText}`);
        }

        const data = await response.json();
        return data.station || null;
    };

    // Validate user access to a station
    const validateStationAccess = async (stationId: number): Promise<boolean> => {
        const token = localStorage.getItem("token");
        if (!token) {
            return false;
        }

        try {
            const response = await fetch(`/api/validation/user-station-access?stationId=${stationId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.hasAccess || false;
        } catch (error) {
            console.error("Error validating station access:", error);
            return false;
        }
    };

    // Refresh stations and set default
    const refreshStations = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const [stations, defaultStation] = await Promise.all([
                fetchUserStations(),
                fetchDefaultStation()
            ]);

            setAvailableStations(stations);

            // Set current station to default if available, otherwise first available station
            if (defaultStation) {
                setCurrentStation(defaultStation);
            } else if (stations.length > 0) {
                setCurrentStation(stations[0]);
            } else {
                setCurrentStation(null);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load stations");
            console.error("Error refreshing stations:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Set current station and validate access
    const handleSetCurrentStation = async (station: Station | null): Promise<void> => {
        if (!station) {
            setCurrentStation(null);
            return;
        }

        // Validate access before setting
        const hasAccess = await validateStationAccess(station.id);
        if (!hasAccess) {
            throw new Error("You don't have access to this station");
        }

        setCurrentStation(station);

        // Update default station on server
        try {
            const token = localStorage.getItem("token");
            if (token) {
                await fetch("/api/users/me/default-station", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ stationId: station.id }),
                });
            }
        } catch (error) {
            console.error("Error updating default station:", error);
            // Don't throw here, station is already set locally
        }
    };

    // Load stations if needed (when user is authenticated and stations not loaded)
    const loadStationsIfNeeded = async (): Promise<void> => {
        const token = localStorage.getItem("token");
        if (token && availableStations.length === 0 && !isLoading) {
            await refreshStations();
        }
    };

    // Load stations on mount (only if user is authenticated)
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            refreshStations();
        }
    }, []);

    const contextValue: StationContextType = {
        currentStation,
        availableStations,
        isLoading,
        error,
        setCurrentStation: handleSetCurrentStation,
        refreshStations,
        validateStationAccess,
        loadStationsIfNeeded,
    };

    return (
        <StationContext.Provider value={contextValue}>
            {children}
        </StationContext.Provider>
    );
};

export const useStation = (): StationContextType => {
    const context = useContext(StationContext);
    if (context === undefined) {
        throw new Error("useStation must be used within a StationProvider");
    }
    return context;
};
