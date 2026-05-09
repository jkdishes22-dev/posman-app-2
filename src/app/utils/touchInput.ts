import type { CSSProperties } from "react";

/**
 * Call on focus for payment/reference fields on touch kiosks. Chromium may expose
 * `navigator.virtualKeyboard` (optional); Windows/macOS still rely on OS settings.
 */
export function requestVirtualKeyboardIfSupported(): void {
  try {
    const nav = navigator as Navigator & {
      virtualKeyboard?: {
        show?: () => Promise<void>;
        overlaysContent?: boolean;
      };
    };
    void nav.virtualKeyboard?.show?.();
  } catch {
    /* API absent or blocked */
  }
}

/** Whether this element should trigger the virtual-keyboard hint (capture-phase focus). */
export function isVirtualKeyboardFocusTarget(el: HTMLElement): boolean {
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName === "SELECT") return true;
  if (el.tagName !== "INPUT") return false;
  const input = el as HTMLInputElement;
  const type = (input.type || "text").toLowerCase();
  const skip = new Set([
    "checkbox",
    "radio",
    "file",
    "hidden",
    "button",
    "submit",
    "reset",
    "image",
    "range",
    "color",
  ]);
  if (skip.has(type)) return false;
  if (input.disabled || input.readOnly) return false;
  return true;
}

/** Opt into Chromium overlay resize when the virtual keyboard is supported (best-effort). */
export function enableVirtualKeyboardOverlayMode(): void {
  try {
    const nav = navigator as Navigator & {
      virtualKeyboard?: { overlaysContent?: boolean };
    };
    if (nav.virtualKeyboard && "overlaysContent" in nav.virtualKeyboard) {
      nav.virtualKeyboard.overlaysContent = true;
    }
  } catch {
    /* noop */
  }
}

/** Reduces double-tap zoom delay on some touch browsers; keeps taps feeling responsive. */
export const touchFriendlyInputStyle: CSSProperties = {
  touchAction: "manipulation",
};
