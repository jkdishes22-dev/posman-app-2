"use client";

import React from "react";
import { usePathname } from "next/navigation";

export interface PageHeaderStripProps {
  /** Title row: use `<h1 className="h4 mb-0 fw-bold">` (+ optional icon / HelpPopover with `className="text-white"`). */
  children: React.ReactNode;
  /** Right-aligned actions (buttons, links, secondary text). Prefer `variant="light"` / `btn-outline-light` on strip. */
  actions?: React.ReactNode;
  className?: string;
  hideAutoBreadcrumbs?: boolean;
}

/**
 * Primary blue page header bar — use on role dashboards, reports, menus, and settings for a consistent top-of-page title strip.
 */
function humanizeSegment(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PageHeaderStrip({
  children,
  actions,
  className,
  hideAutoBreadcrumbs = false,
}: PageHeaderStripProps) {
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean) || [];
  const breadcrumbs = segments
    .filter((segment) => !["admin", "supervisor", "storekeeper", "home"].includes(segment))
    .map(humanizeSegment);

  return (
    <div className={`page-header-strip bg-primary text-white p-3 mb-4 ${className ?? ""}`.trim()}>
      {!hideAutoBreadcrumbs && breadcrumbs.length > 0 ? (
        <div className="small text-white-50 mb-2">
          {breadcrumbs.join(" / ")}
        </div>
      ) : null}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="min-w-0">{children}</div>
        {actions ? (
          <div className="d-flex flex-wrap gap-2 align-items-center flex-shrink-0">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
