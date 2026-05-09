"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useStation } from "./StationContext";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import { isClientPricelistCacheFresh } from "../utils/pricelistClientCache";

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
    refreshPricelists: (options?: { force?: boolean }) => Promise<void>;
    loadPricelistsIfNeeded: () => Promise<void>;
}

const PricelistContext = createContext<PricelistContextType | undefined>(undefined);

interface PricelistProviderProps {
    children: ReactNode;
}

type StationPricelistCacheEntry = {
    pricelists: Pricelist[];
    fetchedAt: number;
};

export const PricelistProvider: React.FC<PricelistProviderProps> = ({ children }) => {
    const { isAuthenticated, logout, checkAuth } = useAuth();
    const { currentStation } = useStation();
    const [currentPricelist, setCurrentPricelist] = useState<Pricelist | null>(null);
    const [availablePricelists, setAvailablePricelists] = useState<Pricelist[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

    const stationPricelistCacheRef = useRef<Map<number, StationPricelistCacheEntry>>(new Map());
    const activeStationIdRef = useRef<number | null>(null);
    const currentStationRef = useRef(currentStation);

    useEffect(() => {
        activeStationIdRef.current = currentStation?.id ?? null;
    }, [currentStation?.id]);

    useEffect(() => {
        currentStationRef.current = currentStation;
    }, [currentStation]);

    const apiCall = useApiCall();

    const fetchUserPricelistsForStation = useCallback(
        async (stationId: number): Promise<Pricelist[]> => {
            if (!checkAuth()) {
                throw new Error("Authentication expired");
            }

            const result = await apiCall(`/api/stations/${stationId}/pricelists`);
            if (result.status === 200) {
                const pricelists = result.data?.pricelists || [];
                return pricelists;
            }
            if (result.status === 401) {
                logout();
                throw new Error("Authentication expired");
            }
            throw new Error(result.error || "Failed to fetch pricelists");
        },
        [checkAuth, logout, apiCall],
    );

    const applyPricelistState = useCallback((pricelists: Pricelist[]) => {
        setAvailablePricelists(pricelists);
        setCurrentPricelist((prev) => {
            if (pricelists.length === 0) {
                return null;
            }
            if (prev && pricelists.some((p) => p.id === prev.id)) {
                return prev;
            }
            return pricelists[0];
        });
    }, []);

    const refreshPricelists = useCallback(
        async (options?: { force?: boolean }): Promise<void> => {
            const force = options?.force ?? false;
            const station = currentStationRef.current;

            if (!station) {
                setAvailablePricelists([]);
                setCurrentPricelist(null);
                setIsLoading(false);
                return;
            }

            const stationId = station.id;
            const cached = stationPricelistCacheRef.current.get(stationId);
            const now = Date.now();
            const cacheFresh =
                cached !== undefined && isClientPricelistCacheFresh(cached.fetchedAt, now);

            if (cached) {
                applyPricelistState(cached.pricelists);
                setError(null);
                setErrorDetails(null);
            }

            if (cacheFresh && !force) {
                setIsLoading(false);
                return;
            }

            const blockingLoader = cached === undefined || force;
            if (blockingLoader) {
                setIsLoading(true);
            }
            setError(null);
            setErrorDetails(null);

            try {
                const pricelists = await fetchUserPricelistsForStation(stationId);
                if (activeStationIdRef.current !== stationId) {
                    return;
                }

                stationPricelistCacheRef.current.set(stationId, {
                    pricelists,
                    fetchedAt: Date.now(),
                });
                applyPricelistState(pricelists);
                setError(null);
                setErrorDetails(null);
            } catch (err: unknown) {
                if (activeStationIdRef.current !== stationId) {
                    return;
                }
                const message = err instanceof Error ? err.message : "Failed to load pricelists";
                setError(message);
                setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
                console.error("Error refreshing pricelists:", err);
            } finally {
                if (activeStationIdRef.current === stationId) {
                    setIsLoading(false);
                }
            }
        },
        [fetchUserPricelistsForStation, applyPricelistState],
    );

    const setCurrentPricelistHandler = async (pricelist: Pricelist | null): Promise<void> => {
        if (!pricelist) {
            setCurrentPricelist(null);
            return;
        }

        const isAvailable = availablePricelists.some((p) => p.id === pricelist.id);
        if (!isAvailable) {
            throw new Error("You don't have access to this pricelist");
        }

        setCurrentPricelist(pricelist);
    };

    const loadPricelistsIfNeeded = useCallback(async (): Promise<void> => {
        const token = localStorage.getItem("token");
        if (token && availablePricelists.length === 0 && !isLoading) {
            await refreshPricelists();
        }
    }, [availablePricelists.length, isLoading, refreshPricelists]);

    useEffect(() => {
        if (!isAuthenticated) {
            stationPricelistCacheRef.current.clear();
            setAvailablePricelists([]);
            setCurrentPricelist(null);
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (currentStation?.id != null && isAuthenticated) {
            void refreshPricelists();
        }
    }, [currentStation?.id, isAuthenticated, refreshPricelists]);

    const contextValue: PricelistContextType = {
        currentPricelist,
        availablePricelists,
        isLoading,
        error,
        errorDetails,
        setCurrentPricelist: setCurrentPricelistHandler,
        refreshPricelists,
        loadPricelistsIfNeeded,
    };

    return <PricelistContext.Provider value={contextValue}>{children}</PricelistContext.Provider>;
};

export const usePricelist = (): PricelistContextType => {
    const context = useContext(PricelistContext);
    if (context === undefined) {
        throw new Error("usePricelist must be used within a PricelistProvider");
    }
    return context;
};
