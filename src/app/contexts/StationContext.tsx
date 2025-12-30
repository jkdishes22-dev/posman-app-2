"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Station } from '../types/types';
import { useAuth } from './AuthContext';
import { useApiCall } from '../utils/apiUtils';
import { ApiErrorResponse } from '../utils/errorUtils';

interface StationContextType {
    currentStation: Station | null;
    availableStations: Station[];
    isLoading: boolean;
    error: string | null;
    setCurrentStation: (station: Station | null) => Promise<void>;
    refreshStations: () => Promise<void>;
    validateStationAccess: (stationId: number) => Promise<boolean>;
    loadStationsIfNeeded: () => Promise<void>;
}

const StationContext = createContext<StationContextType | undefined>(undefined);

interface StationProviderProps {
    children: ReactNode;
}

export const StationProvider: React.FC<StationProviderProps> = ({ children }) => {
    const { isAuthenticated, logout, checkAuth } = useAuth();
    const [currentStation, setCurrentStation] = useState<Station | null>(null);
    const [availableStations, setAvailableStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const hasInitiallyLoaded = useRef(false);

    const apiCall = useApiCall();

    // Fetch user's available stations
    const fetchUserStations = useCallback(async (): Promise<Station[]> => {
        if (!checkAuth()) {
            throw new Error("Authentication expired");
        }

        const result = await apiCall("/api/users/me/stations");
        if (result.status === 200) {
            return result.data.stations || [];
        } else {
            if (result.status === 401) {
                // Token is invalid, logout user
                logout();
                throw new Error("Authentication expired");
            }
            throw new Error(result.error || "Failed to fetch stations");
        }
    }, [checkAuth, logout, apiCall]);

    // Get user's default station
    const fetchDefaultStation = useCallback(async (): Promise<Station | null> => {
        if (!checkAuth()) {
            throw new Error("Authentication expired");
        }

        const result = await apiCall("/api/users/me/default-station");
        if (result.status === 200) {
            return result.data.station || null;
        } else {
            if (result.status === 401) {
                // Token is invalid, logout user
                logout();
                throw new Error("Authentication expired");
            }
            if (result.status === 404) {
                return null; // No default station set
            }
            throw new Error(result.error || "Failed to fetch default station");
        }
    }, [checkAuth, logout, apiCall]);

    // Validate user access to a station
    const validateStationAccess = async (stationId: number): Promise<boolean> => {
        if (!checkAuth()) {
            return false;
        }

        try {
            const result = await apiCall(`/api/validation/user-station-access?stationId=${stationId}`);
            if (result.status === 200) {
                return result.data.hasAccess || false;
            } else {
                if (result.status === 401) {
                    logout();
                }
                return false;
            }
        } catch (error) {
            console.error("Error validating station access:", error);
            return false;
        }
    };

    // Refresh stations and set default
    const refreshStations = useCallback(async (): Promise<void> => {
        // Prevent multiple simultaneous refresh calls
        if (isRefreshing) {
            return;
        }

        setIsRefreshing(true);
        setIsLoading(true);
        setError(null);

        try {
            // Fetch stations
            const stationsResult = await apiCall("/api/users/me/stations");
            if (stationsResult.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/";
                return;
            }

            const stations = stationsResult.status === 200 ? (stationsResult.data.stations || []) : [];

            // Fetch default station
            const defaultResult = await apiCall("/api/users/me/default-station");
            let defaultStation = null;
            if (defaultResult.status === 200) {
                defaultStation = defaultResult.data.station || null;
            }

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
            setIsRefreshing(false);
        }
    }, [isRefreshing]);

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
            await apiCall("/api/users/me/default-station", {
                method: "POST",
                body: JSON.stringify({ stationId: station.id }),
            });
        } catch (error) {
            console.error("Error updating default station:", error);
            // Don't throw here, station is already set locally
        }
    };

    // Load stations if needed (when user is authenticated and stations not loaded)
    const loadStationsIfNeeded = useCallback(async (): Promise<void> => {
        const token = localStorage.getItem("token");
        if (token && availableStations.length === 0 && !isLoading && !isRefreshing) {
            await refreshStations();
        }
    }, [availableStations.length, isLoading, isRefreshing, refreshStations]);

    // Load stations on mount (only if user is authenticated)
    useEffect(() => {
        if (isAuthenticated && !hasInitiallyLoaded.current) {
            hasInitiallyLoaded.current = true;

            const loadStations = async () => {
                setIsRefreshing(true);
                setIsLoading(true);
                setError(null);

                try {
                    // Fetch stations
                    const stationsResult = await apiCall("/api/users/me/stations");
                    if (stationsResult.status === 401) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        window.location.href = "/";
                        return;
                    }

                    const stations = stationsResult.status === 200 ? (stationsResult.data.stations || []) : [];

                    // Fetch default station with timeout handling
                    let defaultStation = null;
                    try {
                        // Add timeout to prevent hanging
                        const timeoutPromise = new Promise((resolve) => {
                            setTimeout(() => resolve({ status: 408, error: "Request timeout" }), 5000);
                        });

                        const defaultResultPromise = apiCall("/api/users/me/default-station");
                        const defaultResult = await Promise.race([defaultResultPromise, timeoutPromise]) as any;

                        if (defaultResult.status === 200) {
                            defaultStation = defaultResult.data?.station || null;
                        }
                    } catch (err) {
                        console.warn("Failed to fetch default station (non-blocking):", err);
                        // Continue without default station - user can select manually
                    }

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
                    setIsRefreshing(false);
                }
            };
            loadStations();
        }
    }, [isAuthenticated]); // Only depend on isAuthenticated

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
