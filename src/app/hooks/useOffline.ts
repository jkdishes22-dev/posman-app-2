"use client";

import { useState, useEffect, useCallback } from "react";
import {
    isOnline,
    onOnlineStatusChange,
    getCacheSizes,
    clearAllCaches,
    getEstimatedCacheSize,
    requestPersistentStorage,
} from "../utils/offlineUtils";

interface CacheInfo {
    name: string;
    size: number;
}

interface UseOfflineReturn {
    isOnline: boolean;
    cacheSizes: CacheInfo[];
    estimatedCacheSizeMB: number;
    refreshCacheInfo: () => Promise<void>;
    clearCache: () => Promise<boolean>;
    requestPersistentStorage: () => Promise<boolean>;
    isLoading: boolean;
}

/**
 * Hook for managing offline state and cache information
 */
export function useOffline(): UseOfflineReturn {
    const [online, setOnline] = useState(true);
    const [cacheSizes, setCacheSizes] = useState<CacheInfo[]>([]);
    const [estimatedCacheSizeMB, setEstimatedCacheSizeMB] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Update online status
    useEffect(() => {
        setOnline(isOnline());

        const cleanup = onOnlineStatusChange(
            () => setOnline(true),
            () => setOnline(false)
        );

        return cleanup;
    }, []);

    // Load cache information
    const refreshCacheInfo = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sizes, estimatedSize] = await Promise.all([
                getCacheSizes(),
                getEstimatedCacheSize(),
            ]);
            setCacheSizes(sizes);
            setEstimatedCacheSizeMB(estimatedSize);
        } catch (error) {
            console.error("Failed to refresh cache info:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load cache info on mount and when coming back online
    useEffect(() => {
        refreshCacheInfo();
    }, [refreshCacheInfo, online]);

    const clearCache = useCallback(async () => {
        setIsLoading(true);
        try {
            const success = await clearAllCaches();
            if (success) {
                await refreshCacheInfo();
            }
            return success;
        } catch (error) {
            console.error("Failed to clear cache:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [refreshCacheInfo]);

    const requestPersistent = useCallback(async () => {
        try {
            return await requestPersistentStorage();
        } catch (error) {
            console.error("Failed to request persistent storage:", error);
            return false;
        }
    }, []);

    return {
        isOnline: online,
        cacheSizes,
        estimatedCacheSizeMB,
        refreshCacheInfo,
        clearCache,
        requestPersistentStorage: requestPersistent,
        isLoading,
    };
}

