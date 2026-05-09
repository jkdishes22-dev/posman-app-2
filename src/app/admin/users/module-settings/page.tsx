"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Accordion } from "react-bootstrap";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import { withSecureRoute } from "../../../components/withSecureRoute";
import { useApiCall } from "../../../utils/apiUtils";

interface MenuNode {
    id: string;
    label: string;
    children?: MenuNode[];
}

const ROLE_MENUS: Record<string, MenuNode[]> = {
    admin: [
        { id: "dashboard", label: "Dashboard" },
        {
            id: "users", label: "Users", children: [
                { id: "users-view", label: "View Users" },
                { id: "users-permission", label: "Roles & Permissions" },
                { id: "users-module-settings", label: "Module Settings" },
            ],
        },
        {
            id: "stations", label: "Stations", children: [
                { id: "stations-overview", label: "Overview" },
                { id: "station-users", label: "Station Users" },
            ],
        },
        {
            id: "menu-pricing", label: "Menu & Pricing", children: [
                { id: "menu-category", label: "Categories" },
                { id: "menu-recipes", label: "Recipes" },
                { id: "menu-pricelist", label: "Pricelists" },
            ],
        },
        {
            id: "production", label: "Production", children: [
                { id: "production-issuing", label: "Issue Production" },
            ],
        },
        { id: "bills", label: "Bill" },
        {
            id: "suppliers", label: "Suppliers", children: [
                { id: "suppliers-list", label: "Suppliers" },
                { id: "suppliers-purchase-orders", label: "Purchase Orders" },
            ],
        },
        {
            id: "inventory", label: "Inventory", children: [
                { id: "inventory-dashboard", label: "Dashboard" },
                { id: "inventory-list", label: "Inventory List" },
                { id: "inventory-transactions", label: "Transactions" },
            ],
        },
        { id: "settings", label: "System Settings" },
        { id: "system-logs", label: "Application Logs" },
        { id: "license-diagnostics", label: "License Diagnostics" },
        {
            id: "reports", label: "Reports", children: [
                { id: "reports-dashboard", label: "Dashboard" },
                { id: "reports-sales-revenue", label: "Sales Revenue" },
                { id: "reports-bill-payments", label: "Bill Payments" },
                { id: "reports-production-stock-revenue", label: "Production/Stock Revenue" },
                { id: "reports-items-sold-count", label: "Items Sold Count" },
                { id: "reports-voided-items", label: "Voided Items" },
                { id: "reports-expenditure", label: "Expenditure" },
                { id: "reports-invoices-pending-bills", label: "Invoices & Pending Bills" },
                { id: "reports-purchase-orders", label: "Purchase Orders" },
                { id: "reports-pnl", label: "Profit & Loss" },
            ],
        },
    ],
    supervisor: [
        { id: "dashboard", label: "Dashboard" },
        {
            id: "bills", label: "Bills", children: [
                { id: "bills-create", label: "Create Bill" },
                { id: "bills-overview", label: "Bills Overview" },
                { id: "bills-manage", label: "Manage Bills" },
                { id: "change-requests", label: "Change Requests" },
                { id: "reopened-bills", label: "Reopened Bills" },
                { id: "bill-settings", label: "Bill Settings" },
            ],
        },
        {
            id: "menu-pricing", label: "Menu & Pricing", children: [
                { id: "menu-category", label: "Categories" },
                { id: "menu-pricelist", label: "Pricelists" },
                { id: "menu-recipes", label: "Recipes" },
            ],
        },
        {
            id: "production", label: "Production", children: [
                { id: "production-issuing", label: "Issue Production" },
            ],
        },
        {
            id: "inventory", label: "Inventory", children: [
                { id: "inventory-dashboard", label: "Dashboard" },
                { id: "inventory-list", label: "Inventory List" },
                { id: "inventory-transactions", label: "Transactions" },
            ],
        },
        {
            id: "suppliers", label: "Suppliers", children: [
                { id: "suppliers-list", label: "Suppliers" },
                { id: "suppliers-purchase-orders", label: "Purchase Orders" },
                { id: "expenses", label: "Expenses" },
            ],
        },
        {
            id: "reports", label: "Reports", children: [
                { id: "reports-pnl", label: "Profit & Loss" },
                { id: "reports-items-sold-count", label: "Items Sold Count" },
                { id: "reports-production-stock-revenue", label: "Production/Stock Revenue" },
                { id: "reports-expenditure", label: "Expenditure" },
                { id: "reports-purchase-orders", label: "Purchase Orders" },
                { id: "reports-sales-revenue", label: "Sales Revenue" },
                { id: "reports-bill-payments", label: "Bill Payments" },
            ],
        },
        { id: "settings", label: "Settings" },
    ],
    cashier: [
        { id: "dashboard", label: "Dashboard" },
        { id: "bills", label: "Bills" },
        {
            id: "reports", label: "Reports", children: [
                { id: "reports-dashboard", label: "Dashboard" },
                { id: "reports-sales-revenue", label: "Sales Revenue" },
                { id: "reports-production-stock-revenue", label: "Production/Stock Revenue" },
                { id: "reports-items-sold-count", label: "Items Sold Count" },
                { id: "reports-voided-items", label: "Voided Items" },
                { id: "reports-expenditure", label: "Expenditure" },
                { id: "reports-invoices-pending-bills", label: "Invoices & Pending Bills" },
                { id: "reports-purchase-orders", label: "Purchase Orders" },
                { id: "reports-pnl", label: "Profit & Loss" },
            ],
        },
    ],
    storekeeper: [
        { id: "dashboard", label: "Dashboard" },
        {
            id: "production", label: "Production", children: [
                { id: "production-issuing", label: "Issue Production" },
                { id: "production-history", label: "History" },
            ],
        },
        {
            id: "inventory", label: "Inventory", children: [
                { id: "inventory-dashboard", label: "Dashboard" },
                { id: "inventory-list", label: "Inventory List" },
                { id: "inventory-transactions", label: "Transactions" },
            ],
        },
        {
            id: "suppliers", label: "Suppliers", children: [
                { id: "suppliers-list", label: "Suppliers" },
                { id: "suppliers-transactions", label: "Transactions" },
                { id: "suppliers-purchase-orders", label: "Purchase Orders" },
            ],
        },
        { id: "reports", label: "Reports" },
    ],
    sales: [
        { id: "dashboard", label: "Dashboard" },
        { id: "bill", label: "Bill" },
        { id: "my-sales", label: "My Sales" },
        { id: "pricelist-catalog", label: "Pricelist Catalog" },
    ],
};

const ROLE_LABELS: Record<string, string> = {
    admin: "Admin",
    supervisor: "Supervisor",
    cashier: "Cashier",
    storekeeper: "Storekeeper",
    sales: "Sales",
};

type VisibilityMap = Record<string, boolean>;

function collectAllIds(nodes: MenuNode[]): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
        ids.push(node.id);
        if (node.children) ids.push(...collectAllIds(node.children));
    }
    return ids;
}

function ToggleSwitch({
    id,
    checked,
    onChange,
}: {
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div
            className="form-check form-switch mb-0"
            onClick={(e) => e.stopPropagation()}
        >
            <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id={`toggle-${id}`}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                style={{ cursor: "pointer" }}
            />
        </div>
    );
}

function LeafRow({
    node,
    visibility,
    onChange,
}: {
    node: MenuNode;
    visibility: VisibilityMap;
    onChange: (id: string, visible: boolean) => void;
}) {
    const visible = visibility[node.id] !== false;
    return (
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
            <span className={visible ? "" : "text-muted text-decoration-line-through"}>
                {node.label}
            </span>
            <ToggleSwitch
                id={node.id}
                checked={visible}
                onChange={(v) => onChange(node.id, v)}
            />
        </div>
    );
}

function GroupAccordionItem({
    node,
    visibility,
    onChange,
}: {
    node: MenuNode;
    visibility: VisibilityMap;
    onChange: (id: string, visible: boolean) => void;
}) {
    const parentVisible = visibility[node.id] !== false;

    return (
        <Accordion.Item eventKey={node.id} className="border-0 border-bottom rounded-0">
            <Accordion.Header>
                <div className="d-flex align-items-center justify-content-between w-100 pe-2">
                    <span className={`fw-medium ${parentVisible ? "" : "text-muted text-decoration-line-through"}`}>
                        {node.label}
                    </span>
                    <ToggleSwitch
                        id={node.id}
                        checked={parentVisible}
                        onChange={(v) => onChange(node.id, v)}
                    />
                </div>
            </Accordion.Header>
            <Accordion.Body className="p-0 bg-light">
                {node.children?.map((child) => {
                    const childVisible = visibility[child.id] !== false;
                    return (
                        <div
                            key={child.id}
                            className="d-flex align-items-center justify-content-between px-4 py-2 border-bottom"
                        >
                            <div className="d-flex align-items-center">
                                <i className="bi bi-arrow-return-right text-muted me-2 small"></i>
                                <span className={childVisible ? "small" : "small text-muted text-decoration-line-through"}>
                                    {child.label}
                                </span>
                            </div>
                            <ToggleSwitch
                                id={child.id}
                                checked={childVisible}
                                onChange={(v) => onChange(child.id, v)}
                            />
                        </div>
                    );
                })}
            </Accordion.Body>
        </Accordion.Item>
    );
}

function ModuleSettingsContent() {
    const [activeRole, setActiveRole] = useState<string>("admin");
    const [visibilityByRole, setVisibilityByRole] = useState<Record<string, VisibilityMap>>({});
    const [loadingRole, setLoadingRole] = useState<string | null>(null);
    const [savingRole, setSavingRole] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string>("");
    const apiCall = useApiCall();

    const fetchVisibility = useCallback(async (role: string) => {
        if (visibilityByRole[role] !== undefined) return;
        setLoadingRole(role);
        setError("");
        const result = await apiCall(`/api/system/module-visibility?role=${role}`);
        setLoadingRole(null);
        if (result.status === 200 && result.data) {
            setVisibilityByRole((prev) => ({ ...prev, [role]: result.data.visibility ?? {} }));
        } else {
            setError(result.error ?? "Failed to load settings");
        }
    }, [apiCall, visibilityByRole]);

    useEffect(() => {
        fetchVisibility(activeRole);
    }, [activeRole, fetchVisibility]);

    const handleToggle = (role: string, id: string, visible: boolean) => {
        setVisibilityByRole((prev) => {
            const current = { ...(prev[role] ?? {}) };
            if (visible) {
                delete current[id];
            } else {
                current[id] = false;
            }
            return { ...prev, [role]: current };
        });
        setSaveSuccess(null);
    };

    const handleSave = async (role: string) => {
        setSavingRole(role);
        setError("");
        setSaveSuccess(null);
        const result = await apiCall("/api/system/module-visibility", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role, visibility: visibilityByRole[role] ?? {} }),
        });
        setSavingRole(null);
        if (result.status === 200) {
            setSaveSuccess(role);
        } else {
            setError(result.error ?? "Failed to save settings");
        }
    };

    const handleShowAll = (role: string) => {
        setVisibilityByRole((prev) => ({ ...prev, [role]: {} }));
        setSaveSuccess(null);
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid px-0">
                <div className="mb-4">
                    <h4 className="fw-semibold mb-1">Module Settings</h4>
                    <p className="text-muted mb-0">
                        Toggle which menus are visible for each role. This is a display preference only and does not affect permissions or access control.
                    </p>
                </div>

                {error && (
                    <div className="alert alert-danger py-2">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {error}
                    </div>
                )}

                {/* Role Tabs */}
                <ul className="nav nav-tabs mb-4">
                    {Object.keys(ROLE_MENUS).map((role) => (
                        <li key={role} className="nav-item">
                            <button
                                className={`nav-link ${activeRole === role ? "active" : ""}`}
                                onClick={() => setActiveRole(role)}
                            >
                                {ROLE_LABELS[role]}
                            </button>
                        </li>
                    ))}
                </ul>

                {/* Tab Content */}
                {Object.keys(ROLE_MENUS).map((role) => (
                    <div key={role} style={{ display: activeRole === role ? "block" : "none" }}>
                        {loadingRole === role ? (
                            <div className="text-center py-5 text-muted">
                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                Loading...
                            </div>
                        ) : (
                            <div className="card shadow-sm">
                                <div className="card-header bg-white d-flex align-items-center justify-content-between py-3">
                                    <div>
                                        <h6 className="mb-0 fw-semibold">{ROLE_LABELS[role]} Menu Visibility</h6>
                                        <small className="text-muted">
                                            {Object.values(visibilityByRole[role] ?? {}).filter((v) => v === false).length} items hidden
                                        </small>
                                    </div>
                                    <button
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => handleShowAll(role)}
                                        title="Reset all to visible"
                                    >
                                        <i className="bi bi-eye me-1"></i>
                                        Show All
                                    </button>
                                </div>

                                <div className="card-body p-0">
                                    {/* Leaf items (no submenu) */}
                                    {(ROLE_MENUS[role] ?? [])
                                        .filter((n) => !n.children)
                                        .map((node) => (
                                            <LeafRow
                                                key={node.id}
                                                node={node}
                                                visibility={visibilityByRole[role] ?? {}}
                                                onChange={(id, visible) => handleToggle(role, id, visible)}
                                            />
                                        ))}

                                    {/* Group items (with submenu) — collapsible accordion */}
                                    {(ROLE_MENUS[role] ?? []).some((n) => n.children) && (
                                        <Accordion flush alwaysOpen>
                                            {(ROLE_MENUS[role] ?? [])
                                                .filter((n) => n.children)
                                                .map((node) => (
                                                    <GroupAccordionItem
                                                        key={node.id}
                                                        node={node}
                                                        visibility={visibilityByRole[role] ?? {}}
                                                        onChange={(id, visible) => handleToggle(role, id, visible)}
                                                    />
                                                ))}
                                        </Accordion>
                                    )}
                                </div>

                                <div className="card-footer bg-white d-flex align-items-center justify-content-between py-3">
                                    {saveSuccess === role ? (
                                        <span className="text-success small">
                                            <i className="bi bi-check-circle me-1"></i>
                                            Saved successfully
                                        </span>
                                    ) : (
                                        <span></span>
                                    )}
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleSave(role)}
                                        disabled={savingRole === role}
                                    >
                                        {savingRole === role ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-save me-2"></i>
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </RoleAwareLayout>
    );
}

export default withSecureRoute(ModuleSettingsContent, ["CAN_EDIT_SYSTEM_SETTINGS"]);