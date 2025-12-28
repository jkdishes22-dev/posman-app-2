import { useEffect } from "react";

export function useTooltips() {
  useEffect(() => {
    // Initialize tooltips after component mounts
    const initTooltips = async () => {
      try {
        const bootstrap = await import("bootstrap/dist/js/bootstrap.bundle.min.js");
        // Only initialize tooltips that haven't been initialized yet
        const tooltipTriggerList = [].slice.call(
          document.querySelectorAll('[data-bs-toggle="tooltip"]:not([data-tooltip-initialized])')
        );
        tooltipTriggerList.forEach((tooltipTriggerEl: any) => {
          // Mark as initialized to avoid re-initializing
          tooltipTriggerEl.setAttribute('data-tooltip-initialized', 'true');
          
          // Dispose existing tooltip if any
          const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
          if (existingTooltip) {
            existingTooltip.dispose();
          }
          // Create new tooltip with HTML support
          new bootstrap.Tooltip(tooltipTriggerEl, {
            html: tooltipTriggerEl.getAttribute('data-bs-html') === 'true',
            placement: tooltipTriggerEl.getAttribute('data-bs-placement') || 'top'
          });
        });
      } catch (error) {
        // Silently fail - Bootstrap might not be loaded yet
      }
    };

    // Initialize after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(initTooltips, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
}

