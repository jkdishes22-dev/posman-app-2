"use client";

import React, { useState, useEffect } from "react";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";

interface NotificationBannerProps {
    userId: number;
    onNotificationClick?: () => void;
}

export default function NotificationBanner({ userId, onNotificationClick }: NotificationBannerProps) {
    const apiCall = useApiCall();
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

    // Fetch unread notification count
    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                setLoading(true);
                const result = await apiCall(`/api/notifications/unread-count?userId=${userId}`);
                if (result.status === 200) {
                    setUnreadCount(result.data.count || 0);
                } else {
                    setError(result.error || "Failed to fetch notification count");
                    setErrorDetails(result.errorDetails);
                }
            } catch (error) {
                setError("Network error occurred");
                setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchUnreadCount();

            // Poll for updates every 30 seconds
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [apiCall, userId]);

    if (loading) {
        return null;
    }

    if (error) {
        return null; // Silently fail for notifications
    }

    if (unreadCount === 0) {
        return null;
    }

    return (
        <div className="position-relative">
            <button
                className="btn btn-link text-decoration-none position-relative"
                onClick={onNotificationClick}
                style={{ color: "white" }}
            >
                <i className="bi bi-bell fs-5"></i>
                <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: "0.7rem" }}
                >
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            </button>
        </div>
    );
}
