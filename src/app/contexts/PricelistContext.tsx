"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useStation } from "./StationContext";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";

export interface Pricelist {
    id: number;
    name: string;
    status: string;
    is_default: boolean;
    description?: string;
    station?: {
        id: number;
        name: string;
    };
}

interface PricelistContextType {
    currentPricelist: Pricelist | null;
    availablePricelists: Pricelist[];
    isLoading: boolean;
    error: string | null;
    errorDetails: ApiErrorResponse | null;
    setCurrentPricelist: (pricelist: Pricelist | null) => Promise<void>;
    refreshPricelists: () => Promise<void>;
    loadPricelistsIfNeeded: () => Promise<void>;
}

const PricelistContext = createContext<PricelistContextType | undefined>(undefined);

interface PricelistProviderProps {
    children: ReactNode;
}

export const PricelistProvider: React.FC<PricelistProviderProps> = ({ children }) => {
    const { isAuthenticated, logout, checkAuth } = useAuth();
    const { currentStation } = useStation();
    const [currentPricelist, setCurrentPricelist] = useState<Pricelist | null>(null);
    const [availablePricelists, setAvailablePricelists] = useState<Pricelist[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const hasInitiallyLoaded = useRef(false);

    const apiCall = useApiCall();

    // Fetch pricelists for the user's default station (for billing section)
    const fetchUserPricelists = useCallback(async (): Promise<Pricelist[]> => {
        if (!checkAuth()) {
            throw new Error("Authentication expired");
        }

        if (!currentStation) {
            return [];
        }

        const result = await apiCall(`/api/stations/${currentStation.id}/pricelists?t=${Date.now()}`);
        if (result.status === 200) {
            const pricelists = result.data?.pricelists || [];
            return pricelists;
        } else {
            if (result.status === 401) {
                logout();
                throw new Error("Authentication expired");
            }
            throw new Error(result.error || "Failed to fetch pricelists");
        }
    }, [checkAuth, logout, apiCall, currentStation]);


    // Refresh pricelists and set default
    const refreshPricelists = useCallback(async (): Promise<void> => {
        // Prevent multiple simultaneous refresh calls
        if (isRefreshing) {
            return;
        }

        setIsRefreshing(true);
        setIsLoading(true);
        setError(null);
        setErrorDetails(null);

        try {
            // Fetch all available pricelists for the user
            const pricelists = await fetchUserPricelists();
            setAvailablePricelists(pricelists);

            // Set current pricelist to the first available pricelist
            // The user can switch between pricelists using the PricelistSwitcher
            if (pricelists.length > 0) {
                setCurrentPricelist(pricelists[0]);
            } else {
                setCurrentPricelist(null);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load pricelists");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            console.error("Error refreshing pricelists:", err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [fetchUserPricelists]);

    // Set current pricelist
    const handleSetCurrentPricelist = async (pricelist: Pricelist | null): Promise<void> => {
        if (!pricelist) {
            setCurrentPricelist(null);
            return;
        }

        // Validate that the pricelist is available to the user
        const isAvailable = availablePricelists.some(p => p.id === pricelist.id);
        if (!isAvailable) {
            throw new Error("You don't have access to this pricelist");
        }

        setCurrentPricelist(pricelist);
    };

    // Load pricelists if needed (when user is authenticated and pricelists not loaded)
    const loadPricelistsIfNeeded = useCallback(async (): Promise<void> => {
        const token = localStorage.getItem("token");
        if (token && availablePricelists.length === 0 && !isLoading && !isRefreshing) {
            await refreshPricelists();
        }
    }, [availablePricelists.length, isLoading, isRefreshing]);

    // Load pricelists when station changes
    useEffect(() => {
        if (currentStation && isAuthenticated) {
            refreshPricelists();
        }
    }, [currentStation, isAuthenticated]);

    // Load pricelists on mount (only if user is authenticated)
    useEffect(() => {
        if (isAuthenticated && !hasInitiallyLoaded.current) {
            hasInitiallyLoaded.current = true;
            loadPricelistsIfNeeded();
        }
    }, [isAuthenticated]);

    const contextValue: PricelistContextType = {
        currentPricelist,
        availablePricelists,
        isLoading,
        error,
        errorDetails,
        setCurrentPricelist: handleSetCurrentPricelist,
        refreshPricelists,
        loadPricelistsIfNeeded,
    };

    return (
        <PricelistContext.Provider value={contextValue}>
            {children}
        </PricelistContext.Provider>
    );
};

export const usePricelist = (): PricelistContextType => {
    const context = useContext(PricelistContext);
    if (context === undefined) {
        throw new Error("usePricelist must be used within a PricelistProvider");
    }
    return context;
};
