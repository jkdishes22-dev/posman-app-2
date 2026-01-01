import { useEffect, useRef } from "react";

export function useTooltips() {
  const tooltipInstancesRef = useRef<any[]>([]);
  const bootstrapRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    tooltipInstancesRef.current = [];

    // Initialize tooltips after component mounts
    const initTooltips = async () => {
      if (!isMountedRef.current) return;

      try {
        const bootstrap = await import("bootstrap/dist/js/bootstrap.bundle.min.js");
        if (!isMountedRef.current) return;

        bootstrapRef.current = bootstrap;

        // Only initialize tooltips that haven't been initialized yet
        const tooltipTriggerList = [].slice.call(
          document.querySelectorAll("[data-bs-toggle=\"tooltip\"]:not([data-tooltip-initialized])")
        );

        tooltipTriggerList.forEach((tooltipTriggerEl: any) => {
          if (!isMountedRef.current) return;

          // Mark as initialized to avoid re-initializing
          tooltipTriggerEl.setAttribute("data-tooltip-initialized", "true");

          // Dispose existing tooltip if any
          const existingTooltip = (bootstrap as any).Tooltip.getInstance(tooltipTriggerEl);
          if (existingTooltip) {
            existingTooltip.dispose();
          }

          // Create new tooltip with HTML support
          const tooltipInstance = new (bootstrap as any).Tooltip(tooltipTriggerEl, {
            html: tooltipTriggerEl.getAttribute("data-bs-html") === "true",
            placement: tooltipTriggerEl.getAttribute("data-bs-placement") || "top"
          });

          tooltipInstancesRef.current.push({ instance: tooltipInstance, element: tooltipTriggerEl });
        });
      } catch (error) {
        // Silently fail - Bootstrap might not be loaded yet
      }
    };

    // Initialize after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(initTooltips, 100);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);

      // Dispose all tooltip instances when component unmounts
      tooltipInstancesRef.current.forEach(({ instance, element }) => {
        try {
          instance?.dispose();
          // Remove the initialization marker so tooltips can be re-initialized if needed
          element?.removeAttribute("data-tooltip-initialized");
        } catch (error) {
          // Ignore errors during disposal
        }
      });

      tooltipInstancesRef.current = [];
    };
  }, []);
}

