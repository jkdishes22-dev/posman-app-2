"use client";

import { useEffect } from "react";
import {
  enableVirtualKeyboardOverlayMode,
  isVirtualKeyboardFocusTarget,
  requestVirtualKeyboardIfSupported,
} from "../utils/touchInput";

/**
 * App-wide: when any real text/numeric field receives focus, hint the OS / Chromium
 * virtual keyboard. Runs on document capture — inputs do **not** need to be inside
 * `<form>` for this to apply. Pair with Bootstrap Modal default `enforceFocus={false}`
 * (see BootstrapClient) so touch keyboards are not blocked by focus trapping.
 */
export default function TouchKeyboardSupport() {
  useEffect(() => {
    enableVirtualKeyboardOverlayMode();

    const onFocusIn = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (!isVirtualKeyboardFocusTarget(t)) return;
      requestVirtualKeyboardIfSupported();
    };

    document.addEventListener("focusin", onFocusIn, true);
    return () => document.removeEventListener("focusin", onFocusIn, true);
  }, []);

  return null;
}
