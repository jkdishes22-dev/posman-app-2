"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    status: string;
    created_at: string;
    data?: any;
}

interface NotificationDropdownProps {
    userId: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationDropdown({ userId, isOpen, onClose }: NotificationDropdownProps) {
    const apiCall = useApiCall();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen && userId) {
            fetchNotifications();
        }
    }, [isOpen, userId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const result = await apiCall(`/api/notifications?userId=${userId}&limit=10`);
            if (result.status === 200) {
                setNotifications(result.data.notifications || []);
            } else {
                setError(result.error || "Failed to fetch notifications");
                setErrorDetails(result.errorDetails);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: number) => {
        try {
            const result = await apiCall("/api/notifications/mark-read", {
                method: "POST",
                body: JSON.stringify({
                    notificationId,
                    userId
                })
            });

            if (result.status === 200) {
                // Update local state
                setNotifications(prev =>
                    prev.map(notif =>
                        notif.id === notificationId
                            ? { ...notif, status: "read" }
                            : notif
                    )
                );
            }
        } catch (error) {
            // Silently fail for notifications
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "bill_reopened":
                return "bi-arrow-clockwise";
            case "bill_resubmitted":
                return "bi-check-circle";
            case "void_request":
                return "bi-exclamation-triangle";
            case "void_approved":
                return "bi-check-circle-fill";
            case "void_rejected":
                return "bi-x-circle-fill";
            default:
                return "bi-bell";
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case "bill_reopened":
                return "text-warning";
            case "bill_resubmitted":
                return "text-success";
            case "void_request":
                return "text-info";
            case "void_approved":
                return "text-success";
            case "void_rejected":
                return "text-danger";
            default:
                return "text-primary";
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div
            ref={dropdownRef}
            className="position-absolute end-0 mt-2"
            style={{
                minWidth: "350px",
                maxWidth: "400px",
                zIndex: 1050,
                backgroundColor: "white",
                border: "1px solid #dee2e6",
                borderRadius: "0.375rem",
                boxShadow: "0 0.5rem 1rem rgba(0, 0, 0, 0.15)"
            }}
        >
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                <h6 className="mb-0">Notifications</h6>
                <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onClose}
                >
                    <i className="bi bi-x"></i>
                </button>
            </div>

            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {loading ? (
                    <div className="p-3 text-center">
                        <div className="spinner-border spinner-border-sm" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="p-3 text-center text-danger">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Failed to load notifications
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-3 text-center text-muted">
                        <i className="bi bi-bell-slash me-2"></i>
                        No notifications
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-3 border-bottom ${notification.status === "unread" ? "bg-light" : ""}`}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                                if (notification.status === "unread") {
                                    markAsRead(notification.id);
                                }
                            }}
                        >
                            <div className="d-flex align-items-start">
                                <div className="me-3">
                                    <i className={`bi ${getNotificationIcon(notification.type)} ${getNotificationColor(notification.type)}`}></i>
                                </div>
                                <div className="flex-grow-1">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <h6 className="mb-1">{notification.title}</h6>
                                        {notification.status === "unread" && (
                                            <span className="badge bg-primary">New</span>
                                        )}
                                    </div>
                                    <p className="mb-1 text-muted small">{notification.message}</p>
                                    <small className="text-muted">
                                        {new Date(notification.created_at).toLocaleString()}
                                    </small>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {notifications.length > 0 && (
                <div className="p-3 border-top text-center">
                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                            // Navigate to full notifications page
                            window.location.href = "/notifications";
                        }}
                    >
                        View All Notifications
                    </button>
                </div>
            )}
        </div>
    );
}
