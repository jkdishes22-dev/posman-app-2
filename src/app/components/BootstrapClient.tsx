"use client"; // This should be the first line of the file

import { useEffect } from "react";

function BootstrapClient() {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js")
      .then((bootstrap) => {
        // Initialize tooltips globally
        const tooltipTriggerList = [].slice.call(
          document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.map(function (tooltipTriggerEl: any) {
          return new bootstrap.Tooltip(tooltipTriggerEl);
        });
      })
      .catch((error) => {
        console.error("Error loading Bootstrap:", error);
      });
  }, []);

  return null;
}

export default BootstrapClient;
