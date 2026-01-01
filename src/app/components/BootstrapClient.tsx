"use client"; // This should be the first line of the file

import { useEffect } from "react";

function BootstrapClient() {
  useEffect(() => {
    // Just ensure Bootstrap is loaded - tooltips are handled by useTooltips hook in components
    import("bootstrap/dist/js/bootstrap.bundle.min.js")
      .catch((error) => {
        console.error("Error loading Bootstrap:", error);
      });
  }, []);

  return null;
}

export default BootstrapClient;
