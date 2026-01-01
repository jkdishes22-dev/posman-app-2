"use client";

import React from 'react';
import { Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

interface LogoutButtonProps {
    variant?: string;
    size?: 'sm' | 'lg';
    className?: string;
    children?: React.ReactNode;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({
    variant = "outline-danger",
    size = "sm",
    className = "",
    children = "Logout"
}) => {
    const { logout } = useAuth();

    const handleLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            logout();
        } catch (error) {
            console.error("Error in logout handler:", error);
            // Force redirect even if there's an error
            if (typeof window !== "undefined") {
                window.location.replace("/");
            }
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleLogout}
        >
            {children}
        </Button>
    );
};

export default LogoutButton;
