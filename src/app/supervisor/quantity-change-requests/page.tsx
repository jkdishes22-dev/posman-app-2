"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleAwareLayout from "../../shared/RoleAwareLayout";

export default function SupervisorQuantityChangeRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to unified change-requests page with quantity_change filter
    router.replace("/supervisor/bills/change-requests?requestType=quantity_change");
  }, [router]);

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Redirecting to Bill Change Requests...</p>
        </div>
      </div>
    </RoleAwareLayout>
  );
}
