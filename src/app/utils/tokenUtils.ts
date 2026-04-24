import { createApiCall } from "./apiUtils";

export interface DecodedToken {
    id: number;
    user: Record<string, string>;
    roles: string[];
    iat?: number;
    exp?: number;
}

// jwt.decode() from 'jsonwebtoken' is a Node.js library that causes TDZ errors when
// webpack bundles it for the browser. This replacement does the same thing (base64-decode
// the payload) without pulling in Node.js crypto internals.
export const decodeJwt = <T = DecodedToken>(token: string): T | null => {
    try {
        const payload = token.split(".")[1];
        if (!payload) return null;
        // atob handles standard base64; JWT uses base64url (- and _ variants)
        const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
};

export const isTokenExpiringSoon = (token: string, thresholdMinutes: number = 5): boolean => {
    try {
        const decoded = decodeJwt(token);
        if (!decoded || !decoded.exp) return true;

        const currentTime = Date.now() / 1000;
        const expirationTime = decoded.exp;
        const timeUntilExpiry = expirationTime - currentTime;
        const thresholdSeconds = thresholdMinutes * 60;

        return timeUntilExpiry <= thresholdSeconds;
    } catch (error) {
        console.error("Error checking token expiry:", error);
        return true;
    }
};

export const refreshToken = async (): Promise<string | null> => {
    try {
        // Create a temporary API call function without logout for token refresh
        const apiCall = createApiCall(() => { });
        const result = await apiCall("/api/auth/refresh", {
            method: "POST",
        });

        if (result.status === 200) {
            localStorage.setItem("token", result.data.token);
            return result.data.token;
        } else {
            console.error("Token refresh failed:", result.status);
            return null;
        }
    } catch (error) {
        console.error("Error refreshing token:", error);
        return null;
    }
};

export const getValidToken = async (): Promise<string | null> => {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
        return null;
    }

    // Check if token is expiring soon (within 5 minutes)
    if (isTokenExpiringSoon(currentToken)) {
        const newToken = await refreshToken();
        return newToken;
    }

    return currentToken;
};
