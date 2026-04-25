"use client";

// Supervisor and admin share the same production page (DRY — no duplicate pages per role).
// RoleAwareLayout inside AdminProductionPage reads the session and renders the correct nav.
export { default } from "../../admin/production/page";
