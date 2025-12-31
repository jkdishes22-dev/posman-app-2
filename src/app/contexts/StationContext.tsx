"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { Station } from "../types/types";
import { useAuth } from "./AuthContext";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";

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
    const { isAuthenticated } = useAuth();
    const [currentStation, setCurrentStation] = useState<Station | null>(null);
    const [availableStations, setAvailableStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const hasInitiallyLoaded = useRef(false);

    const apiCall = useApiCall();

    // Fetch user's available stations
    // Note: 401 (token expired) is handled by apiUtils - it will logout automatically
    // 403 (permission denied) means user doesn't have access - return empty array, don't logout
    const fetchUserStations = useCallback(async (): Promise<Station[]> => {
        const result = await apiCall("/api/users/me/stations");
        if (result.status === 200) {
            return result.data.stations || [];
        } else if (result.status === 403) {
            // 403 Forbidden: User is authenticated but doesn't have permission
            // This is fine - some users (e.g., admin) might not have stations assigned
            console.warn("User does not have permission to access stations (non-critical):", result.error);
            return [];
        } else if (result.status === 401) {
            // 401 Unauthorized: Token expired/invalid - apiUtils should handle logout
            // If we get here, apiUtils didn't handle it, so set error and return empty array
            console.warn("Authentication failed when fetching stations:", result.error);
            setError(result.error || "Authentication failed");
            setErrorDetails(result.errorDetails);
            return [];
        } else {
            // Other errors (500, etc.)
            console.warn("Failed to fetch stations:", result.error);
            setError(result.error || "Failed to fetch stations");
            setErrorDetails(result.errorDetails);
            return [];
        }
    }, [apiCall]);

    // Get user's default station
    // Note: 401 (token expired) is handled by apiUtils - it will logout automatically
    // 403 (permission denied) means user doesn't have access - return null, show error, don't logout
    const fetchDefaultStation = useCallback(async (): Promise<Station | null> => {
        const result = await apiCall("/api/users/me/default-station");
        if (result.status === 200) {
            return result.data.station || null;
        } else if (result.status === 403) {
            // 403 Forbidden: User is authenticated but doesn't have permission
            console.warn("User does not have permission to access default station (non-critical):", result.error);
            setError(result.error || "You do not have permission to access default station");
            setErrorDetails(result.errorDetails);
            return null;
        } else if (result.status === 401) {
            // 401 Unauthorized: Token expired/invalid - apiUtils should handle logout
            // If we get here, apiUtils didn't handle it, so set error and return null
            console.warn("Authentication failed when fetching default station:", result.error);
            setError(result.error || "Authentication failed");
            setErrorDetails(result.errorDetails);
            return null;
        } else if (result.status === 404) {
            return null; // No default station set
        } else {
            // Other errors (500, etc.)
            console.warn("Failed to fetch default station:", result.error);
            setError(result.error || "Failed to fetch default station");
            setErrorDetails(result.errorDetails);
            return null;
        }
    }, [apiCall]);

    // Validate user access to a station
    const validateStationAccess = async (stationId: number): Promise<boolean> => {
        try {
            const result = await apiCall(`/api/validation/user-station-access?stationId=${stationId}`);
            if (result.status === 200) {
                return result.data.hasAccess || false;
            } else if (result.status === 403) {
                // 403 Forbidden: User is authenticated but doesn't have permission
                // This is fine - just return false
                return false;
            } else if (result.status === 401) {
                // 401 Unauthorized: Token expired/invalid - apiUtils should handle logout
                // Just return false here
                return false;
            } else {
                // Other errors
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
        setErrorDetails(null);

        try {
            // Fetch stations
            // Note: 401 (token expired) is handled by apiUtils - it will logout automatically
            // 403 (permission denied) means user doesn't have access - return empty array, show error, don't logout
            const stationsResult = await apiCall("/api/users/me/stations");
            let stations: Station[] = [];

            if (stationsResult.status === 200) {
                stations = stationsResult.data.stations || [];
            } else if (stationsResult.status === 403) {
                // 403 Forbidden: User is authenticated but doesn't have permission
                // This is fine - some users (e.g., admin) might not have stations assigned
                console.warn("User does not have permission to access stations (non-critical):", stationsResult.error);
                setError(stationsResult.error || "You do not have permission to access stations");
                setErrorDetails(stationsResult.errorDetails);
                stations = [];
            } else if (stationsResult.status === 401) {
                // 401 Unauthorized: Token expired/invalid - apiUtils should handle logout
                // If we get here, apiUtils didn't handle it, so set error and let it propagate
                setError(stationsResult.error || "Authentication failed");
                setErrorDetails(stationsResult.errorDetails);
                stations = [];
            } else {
                // Other errors (500, etc.) - log but don't block
                console.warn("Failed to fetch stations (non-blocking):", stationsResult.error);
                setError(stationsResult.error || "Failed to fetch stations");
                setErrorDetails(stationsResult.errorDetails);
                stations = [];
            }

            // Fetch default station - handle errors gracefully
            let defaultStation: Station | null = null;
            try {
                const defaultResult = await apiCall("/api/users/me/default-station");
                if (defaultResult.status === 200) {
                    defaultStation = defaultResult.data.station || null;
                } else if (defaultResult.status === 403) {
                    // 403 Forbidden: User is authenticated but doesn't have permission
                    console.warn("User does not have permission to access default station (non-critical):", defaultResult.error);
                    defaultStation = null;
                } else if (defaultResult.status === 401) {
                    // 401 Unauthorized: Token expired/invalid - apiUtils should handle logout
                    // If we get here, just treat as no default station
                    console.warn("Authentication failed when fetching default station:", defaultResult.error);
                    defaultStation = null;
                } else if (defaultResult.status === 404) {
                    defaultStation = null;
                } else {
                    // Non-critical error
                    console.warn("Failed to fetch default station (non-blocking):", defaultResult.error);
                    defaultStation = null;
                }
            } catch (defaultErr) {
                // Non-critical error
                console.warn("Error fetching default station (non-blocking):", defaultErr);
                defaultStation = null;
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
            // Only log error, don't logout - user might just not have stations
            console.error("Error refreshing stations:", err);
            setError(err.message || "Failed to load stations");
            setErrorDetails({ message: err.message, networkError: true, status: 0 });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [isRefreshing, apiCall]);

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
                // Token should already be available from auth context

                // Double-check token exists before making API call
                const token = localStorage.getItem("token");
                if (!token || token === "null" || token === "undefined" || token.trim() === "") {
                    console.warn("No valid token found when loading stations");
                    setError("Authentication token not found");
                    setIsLoading(false);
                    return;
                }

                setIsRefreshing(true);
                setIsLoading(true);
                setError(null);

                try {
                    // Fetch stations
                    // Note: 401 (token expired) is handled by apiUtils - it will logout automatically
                    // 403 (permission denied) means user doesn't have access - return empty array, show error, don't logout
                    const stationsResult = await apiCall("/api/users/me/stations");
                    let stations: Station[] = [];

                    if (stationsResult.status === 200) {
                        stations = stationsResult.data.stations || [];
                    } else if (stationsResult.status === 403) {
                        // 403 Forbidden: User is authenticated but doesn't have permission
                        // This is fine - some users (e.g., admin) might not have stations assigned
                        console.warn("User does not have permission to access stations (non-critical):", stationsResult.error);
                        setError(stationsResult.error || "You do not have permission to access stations");
                        setErrorDetails(stationsResult.errorDetails);
                        stations = [];
                    } else if (stationsResult.status === 401) {
                        // 401 Unauthorized: Token expired/invalid - apiUtils should handle logout
                        // If we get here, apiUtils didn't handle it, so set error
                        console.warn("Authentication failed when fetching stations:", stationsResult.error);
                        setError(stationsResult.error || "Authentication failed");
                        setErrorDetails(stationsResult.errorDetails);
                        stations = [];
                    } else {
                        // Other errors (500, etc.)
                        console.warn("Failed to fetch stations (non-blocking):", stationsResult.error);
                        setError(stationsResult.error || "Failed to fetch stations");
                        setErrorDetails(stationsResult.errorDetails);
                        stations = [];
                    }

                    // Fetch default station - handle errors gracefully
                    let defaultStation: Station | null = null;
                    try {
                        const defaultResult = await apiCall("/api/users/me/default-station");
                        if (defaultResult.status === 200) {
                            defaultStation = defaultResult.data?.station || null;
                        } else if (defaultResult.status === 403) {
                            // 403 Forbidden: User is authenticated but doesn't have permission
                            console.warn("User does not have permission to access default station (non-critical):", defaultResult.error);
                            defaultStation = null;
                        } else if (defaultResult.status === 401) {
                            // 401 Unauthorized: Token expired/invalid - apiUtils should handle logout
                            console.warn("Authentication failed when fetching default station:", defaultResult.error);
                            defaultStation = null;
                        } else if (defaultResult.status === 404) {
                            defaultStation = null; // No default station set
                        } else {
                            // Other errors - log but don't block
                            console.warn("Failed to fetch default station (non-blocking):", defaultResult.error);
                            defaultStation = null;
                        }
                    } catch (err) {
                        // Network errors - log but don't block
                        console.warn("Error fetching default station (non-blocking):", err);
                        defaultStation = null;
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
