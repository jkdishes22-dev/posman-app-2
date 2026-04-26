"use client"; // This should be the first line of the file

import { useEffect } from "react";

function BootstrapClient() {
  useEffect(() => {
    // Unregister stale service workers in development so cached HTML pages
    // from a prior production build don't interfere with API calls.
    if (process.env.NODE_ENV === "development" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
    }
  }, []);

  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js")
      .then((bootstrap) => {
        // Initialize tooltips globally
        const tooltipTriggerList = [].slice.call(
          document.querySelectorAll("[data-bs-toggle=\"tooltip\"]")
        );
        tooltipTriggerList.map(function (tooltipTriggerEl: any) {
          return new (bootstrap as any).Tooltip(tooltipTriggerEl, {
            trigger: "hover focus",
            delay: { show: 200, hide: 100 }
          });
        });
      })
      .catch((error) => {
        console.error("Error loading Bootstrap:", error);
      });
  }, []);

  return null;
}

export default BootstrapClient;
