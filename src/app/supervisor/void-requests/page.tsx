"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";

const SupervisorVoidRequestsPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to unified change-requests page
    // Preserve requestType query param if present
    const urlParams = new URLSearchParams(window.location.search);
    const requestType = urlParams.get("requestType") || "void";
    router.replace(`/supervisor/bills/change-requests?requestType=${requestType}`);
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
};

export default SupervisorVoidRequestsPage;
