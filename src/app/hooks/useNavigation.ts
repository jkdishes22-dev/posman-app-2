"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export type BreadcrumbItem = { label: string; path: string };

export type RouteEntry = {
  pattern: string;
  activeItem: string;
  expandedMenuIds: string[];
  breadcrumbs: BreadcrumbItem[];
};

/** Sort entries longest-pattern-first so more specific paths always win. Call once at module load. */
export function sortRoutes(entries: RouteEntry[]): RouteEntry[] {
  return [...entries].sort((a, b) => b.pattern.length - a.pattern.length);
}

export function useNavigation(routes: RouteEntry[], defaultBreadcrumb: BreadcrumbItem) {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([defaultBreadcrumb]);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  useEffect(() => {
    const matched = routes.find(({ pattern }) => pathname.includes(pattern));
    setActiveItem(matched?.activeItem ?? "");
    setBreadcrumbs(matched?.breadcrumbs ?? [defaultBreadcrumb]);
    setExpandedMenus(matched?.expandedMenuIds ?? []);
    // routes and defaultBreadcrumb are stable module-level constants
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return { activeItem, setActiveItem, breadcrumbs, expandedMenus, setExpandedMenus };
}