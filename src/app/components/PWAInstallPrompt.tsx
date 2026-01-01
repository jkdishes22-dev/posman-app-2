"use client";

import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA Install Prompt Component
 * 
 * Displays a custom install prompt when the PWA is installable.
 * This provides a better UX than the browser's default install prompt.
 * 
 * Usage:
 * <PWAInstallPrompt />
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className="alert alert-info d-flex align-items-center justify-content-between mb-0"
      role="alert"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1050,
        maxWidth: "400px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="d-flex align-items-center">
        <i className="bi bi-download me-2" style={{ fontSize: "1.5rem" }}></i>
        <div>
          <strong>Install JK PosMan</strong>
          <br />
          <small>Install this app for a better experience</small>
        </div>
      </div>
      <div className="d-flex gap-2 ms-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleInstallClick}
        >
          Install
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => setShowInstallPrompt(false)}
        >
          <i className="bi bi-x"></i>
        </Button>
      </div>
    </div>
  );
}

