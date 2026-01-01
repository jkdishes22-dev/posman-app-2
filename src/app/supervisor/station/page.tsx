"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Supervisor station page - redirects to admin station page
// The admin page uses RoleAwareLayout which will automatically show SupervisorLayout for supervisor role
// APIs are reusable, so we can use the same page
export default function SupervisorStationPage() {
    const router = useRouter();

    useEffect(() => {
        // Use replace immediately to avoid adding to history
        // This performs a client-side navigation without full page reload
        router.replace("/admin/station");
    }, [router]);

    // Return null immediately - the redirect happens in useEffect
    return null;
}

