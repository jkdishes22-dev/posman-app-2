"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

// Supervisor station users page - redirects to admin station users page
// The admin page uses RoleAwareLayout which will automatically show SupervisorLayout for supervisor role
// APIs are reusable, so we can use the same page
export default function SupervisorStationUsersPage() {
    const router = useRouter();

    useEffect(() => {
        // Since APIs are reusable and RoleAwareLayout handles layout selection,
        // we can redirect to the admin page which will automatically use SupervisorLayout
        router.replace("/admin/station/user");
    }, [router]);

    return null;
}

