"use client";

import React, { useEffect, useState } from "react";

const STORAGE_KEY = "keyboard_visible";

export default function KeyboardToggleButton() {
  const [visible, setVisible] = useState(false);
  const [isElectronWin, setIsElectronWin] = useState(false);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron || electron.platform !== "win32") return;
    setIsElectronWin(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default to hidden — the keyboard should only appear when the user asks
    const initial = stored === "true";
    setVisible(initial);
    if (initial) {
      electron.toggleKeyboard(true);
    }
  }, []);

  if (!isElectronWin) return null;

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
