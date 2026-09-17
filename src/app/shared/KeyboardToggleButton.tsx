"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "keyboard_visible";

export default function KeyboardToggleButton() {
  const [visible, setVisible] = useState(false);
  const [isElectronWin, setIsElectronWin] = useState(false);
  const [hasFormElements, setHasFormElements] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron || electron.platform !== "win32") return;
    setIsElectronWin(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial = stored === "true";
    setVisible(initial);
    if (initial) electron.toggleKeyboard(true);
  }, []);

  // Re-check for form elements on every route change, after the page renders
  useEffect(() => {
    const timer = setTimeout(() => {
      const found = document.querySelectorAll(
        "input:not([type=\"hidden\"]), textarea, select"
      ).length > 0;
      setHasFormElements(found);
    }, 150);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!isElectronWin || !hasFormElements) return null;

  const toggle = () => {
    const next = !visible;
    setVisible(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    (window as any).electron.toggleKeyboard(next);
  };

  return (
    <button
      className={`btn btn-sm ${visible ? "btn-light" : "btn-outline-light"}`}
      onClick={toggle}
      title={visible ? "Hide on-screen keyboard" : "Show on-screen keyboard"}
      aria-label={visible ? "Hide on-screen keyboard" : "Show on-screen keyboard"}
      aria-pressed={visible}
    >
      <i className={`bi ${visible ? "bi-keyboard-fill" : "bi-keyboard"}`} aria-hidden />
    </button>
  );
}
