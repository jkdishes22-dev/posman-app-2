"use client"; // This should be the first line of the file

import { useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import TouchKeyboardSupport from "./TouchKeyboardSupport";

/* Touch / kiosk: Bootstrap modals default to enforceFocus=true, which can block the OS
   touch keyboard. Default to false so fields inside modals still trigger TabTip / mobile keyboards.
   Pass enforceFocus={true} on a specific Modal if you need strict focus trapping. */
const ModalWithDefaults = Modal as typeof Modal & {
  defaultProps?: { enforceFocus?: boolean };
};
ModalWithDefaults.defaultProps = {
  ...(ModalWithDefaults.defaultProps ?? {}),
  enforceFocus: false,
};

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
        tooltipTriggerList.map(function (tooltipTriggerEl: HTMLElement) {
          return new (bootstrap as unknown as { Tooltip: new (el: HTMLElement, opts: object) => unknown }).Tooltip(tooltipTriggerEl, {
            trigger: "hover focus",
            delay: { show: 200, hide: 100 }
          });
        });
      })
      .catch((error) => {
        console.error("Error loading Bootstrap:", error);
      });
  }, []);

  return (
    <>
      <TouchKeyboardSupport />
    </>
  );
}

export default BootstrapClient;
