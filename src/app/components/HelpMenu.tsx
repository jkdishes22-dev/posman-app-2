"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

export default function HelpMenu() {
    const router = useRouter();
    const { user } = useAuth();

    const handleHelpClick = () => {
        // Get primary role from user
        const primaryRole = user?.roles?.[0]?.name || "admin";
        router.push(`/help/${primaryRole}`);
    };

    return (
        <button
            className="dropdown-item"
            onClick={handleHelpClick}
            type="button"
        >
            <i className="bi bi-question-circle me-2"></i>
            Help & Documentation
        </button>
    );
}

