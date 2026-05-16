"use client";
import React, { useState, useEffect, useCallback } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Badge,
    Button,
    Table,
    Modal,
    Form,
    InputGroup,
    Spinner,
    Alert,
} from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import HelpPopover from "../../components/HelpPopover";

interface SuppliableItem {
    id: number;
    name: string;
    code: string;
    category: string;
    hasPurchaseConfig: boolean;
    purchaseConfigActive: boolean | null;
    purchaseUnitLabel: string | null;
    purchaseUnitQty: number | null;
    unitOfMeasure: string | null;
    defaultPurchasePrice: number | null;
}

interface PurchaseItemRecord {
    id: number;
    item_id: number;
    purchase_unit_label: string;
    purchase_unit_qty: number;
    unit_of_measure: string | null;
    is_active: boolean;
    default_purchase_price: number | null;
    item: { id: number; name: string; code: string };
}

interface UomSettings {
    mass: string[];
    volume: string[];
    count: string[];
    length: string[];
}

const UOM_CATEGORY_LABELS: Record<keyof UomSettings, string> = {
    mass: "Weight / Mass",
    volume: "Volume",
    count: "Count / Packaging",
    length: "Length",
};

const DEFAULT_UOM: UomSettings = { mass: [], volume: [], count: [], length: [] };

export default function PurchaseItemsPage() {
    const apiCall = useApiCall();

    const [items, setItems] = useState<SuppliableItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<SuppliableItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [uomSettings, setUomSettings] = useState<UomSettings>(DEFAULT_UOM);
    const [uomGroups, setUomGroups] = useState<{ label: string; units: string[] }[]>([]);
    const [allKnownUom, setAllKnownUom] = useState<string[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterConfigured, setFilterConfigured] = useState<"all" | "yes" | "no">("all");

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState<PurchaseItemRecord | null>(null);
    const [modalItem, setModalItem] = useState<SuppliableItem | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingRecord, setDeletingRecord] = useState<{ id: number; itemName: string } | null>(null);

    // Form
    const [formLabel, setFormLabel] = useState("");
    const [formQty, setFormQty] = useState("");
    const [formUom, setFormUom] = useState("");
    const [formPrice, setFormPrice] = useState("");
    const [formActive, setFormActive] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        apiCall("/api/system/settings?key=unit_of_measurement").then((res) => {
            if (res.status === 200 && res.data?.value && typeof res.data.value === "object") {
                const val = res.data.value as UomSettings;
                const settings: UomSettings = {
                    mass: Array.isArray(val.mass) ? val.mass : [],
                    volume: Array.isArray(val.volume) ? val.volume : [],
                    count: Array.isArray(val.count) ? val.count : [],
                    length: Array.isArray(val.length) ? val.length : [],
                };
                setUomSettings(settings);
                setUomGroups(
                    (Object.keys(UOM_CATEGORY_LABELS) as (keyof UomSettings)[])
                        .filter((k) => settings[k].length > 0)
                        .map((k) => ({ label: UOM_CATEGORY_LABELS[k], units: settings[k] }))
                );
                setAllKnownUom([...settings.mass, ...settings.volume, ...settings.count, ...settings.length]);
            }
        }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await apiCall("/api/items/suppliable?all=true&limit=10000");
            if (result.status >= 200 && result.status < 300) {
                setItems(Array.isArray(result.data?.items) ? result.data.items : []);
            } else {
                setError(result.error || "Failed to load items");
            }
        } catch (err: any) {
            setError(err?.message || "Failed to load items");
        } finally {
            setIsLoading(false);
        }
    }, [apiCall]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    useEffect(() => {
        let result = items;
        if (filterConfigured !== "all") {
            result = result.filter((i) =>
                filterConfigured === "yes" ? i.hasPurchaseConfig : !i.hasPurchaseConfig
            );
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (i) =>
                    i.name.toLowerCase().includes(q) ||
                    i.code.toLowerCase().includes(q) ||
                    i.category.toLowerCase().includes(q)
            );
        }
        setFilteredItems(result);
    }, [items, searchQuery, filterConfigured]);

    const openAddModal = (item: SuppliableItem) => {
        setModalItem(item);
        setEditingRecord(null);
        setFormLabel("");
        setFormQty("");
        setFormUom("");
        setFormPrice("");
        setFormActive(true);
        setFormError(null);
        setShowModal(true);
    };

    const openEditModal = async (item: SuppliableItem) => {
        setModalItem(item);
        setFormError(null);
        setShowModal(true);
        setSaving(true);
        try {
            const result = await apiCall("/api/purchase-items");
            if (result.status >= 200 && result.status < 300) {
                const allConfigs: PurchaseItemRecord[] = Array.isArray(result.data?.items) ? result.data.items : [];
                const record = allConfigs.find((r) => r.item_id === item.id) || null;
                setEditingRecord(record);
                setFormLabel(record?.purchase_unit_label || "");
                setFormQty(record ? String(Number(record.purchase_unit_qty)) : "");
                setFormUom(record?.unit_of_measure || "");
                setFormPrice(record?.default_purchase_price != null ? String(record.default_purchase_price) : "");
                setFormActive(record?.is_active !== false);
            } else {
                setFormError("Failed to load config");
            }
        } catch {
            setFormError("Failed to load config");
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        setFormError(null);
        const qty = parseFloat(formQty);
        if (!formLabel.trim()) {
            setFormError("Pack label is required");
            return;
        }
        if (isNaN(qty) || qty <= 0) {
            setFormError("Pack quantity must be a positive number");
            return;
        }
        setSaving(true);
        try {
            let result;
            const defaultPrice = formPrice.trim() ? parseFloat(formPrice) : null;
            if (editingRecord) {
                result = await apiCall(
                    `/api/purchase-items/${editingRecord.id}`,
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            purchase_unit_label: formLabel.trim(),
                            purchase_unit_qty: qty,
                            unit_of_measure: formUom.trim() || null,
                            is_active: formActive,
                            default_purchase_price: defaultPrice,
                        }),
                    }
                );
            } else {
                result = await apiCall(
                    "/api/purchase-items",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            item_id: modalItem!.id,
                            purchase_unit_label: formLabel.trim(),
                            purchase_unit_qty: qty,
                            unit_of_measure: formUom.trim() || null,
                            is_active: true,
                            default_purchase_price: defaultPrice,
                        }),
                    }
                );
            }
            if (result.status >= 200 && result.status < 300) {
                setShowModal(false);
                await fetchItems();
            } else {
                setFormError(result.error || "Failed to save");
            }
        } catch (err: any) {
            setFormError(err?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletingRecord) return;
        setDeleting(true);
        try {
            const listResult = await apiCall("/api/purchase-items");
            if (listResult.status >= 200 && listResult.status < 300) {
                const allConfigs: PurchaseItemRecord[] = Array.isArray(listResult.data?.items) ? listResult.data.items : [];
                const record = allConfigs.find((r) => r.item_id === deletingRecord.id);
                if (record) {
                    const delResult = await apiCall(
                        `/api/purchase-items/${record.id}`,
                        { method: "DELETE" }
                    );
                    if (delResult.status >= 200 && delResult.status < 300) {
                        setShowDeleteModal(false);
                        setDeletingRecord(null);
                        await fetchItems();
                    } else {
                        setError(delResult.error || "Failed to delete");
                    }
                }
            }
        } catch (err: any) {
            setError(err?.message || "Failed to delete");
        } finally {
            setDeleting(false);
        }
    };

    const configuredCount = items.filter((i) => i.hasPurchaseConfig).length;

    const isCustomUom = formUom !== "" && !allKnownUom.includes(formUom);
    const uomSelectValue = isCustomUom ? "__custom__" : formUom;

    return (
        <RoleAwareLayout>
            <PageHeaderStrip>
                <h1 className="h4 mb-0 fw-bold">Purchase Item Config</h1>
                <small className="opacity-75">Define pack sizes and units for suppliable items before creating purchase orders</small>
            </PageHeaderStrip>

            <div className="p-3">
                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
                    <InputGroup style={{ maxWidth: 300 }}>
                        <InputGroup.Text>
                            <i className="bi bi-search" />
                        </InputGroup.Text>
                        <Form.Control
                            placeholder="Search by name, code, category…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </InputGroup>
                    <Form.Select
                        style={{ maxWidth: 220 }}
                        value={filterConfigured}
                        onChange={(e) => setFilterConfigured(e.target.value as "all" | "yes" | "no")}
                    >
                        <option value="all">All items ({items.length})</option>
                        <option value="yes">Configured ({configuredCount})</option>
                        <option value="no">Not configured ({items.length - configuredCount})</option>
                    </Form.Select>
                </div>

                {isLoading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <Alert variant="info">No items match your filter.</Alert>
                ) : (
                    <div className="table-responsive">
                        <Table hover size="sm" className="align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Item</th>
                                    <th>Code</th>
                                    <th>Category</th>
                                    <th>Pack Label</th>
                                    <th>Pack Qty</th>
                                    <th>UoM</th>
                                    <th>Default Price</th>
                                    <th>Status</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr key={item.id}>
                                        <td className="fw-semibold">{item.name}</td>
                                        <td className="text-muted small">{item.code}</td>
                                        <td className="text-muted small">{item.category}</td>
                                        {item.hasPurchaseConfig ? (
                                            <>
                                                <td>{item.purchaseUnitLabel}</td>
                                                <td>{Number(item.purchaseUnitQty)}</td>
                                                <td className="text-muted small">{item.unitOfMeasure || "—"}</td>
                                                <td className="text-muted small">
                                                    {item.defaultPurchasePrice != null
                                                        ? Number(item.defaultPurchasePrice).toFixed(2)
                                                        : "—"}
                                                </td>
                                                <td>
                                                    {item.purchaseConfigActive
                                                        ? <Badge bg="success">Active</Badge>
                                                        : <Badge bg="warning" text="dark">Inactive</Badge>}
                                                </td>
                                                <td className="text-end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-secondary"
                                                        className="me-1"
                                                        onClick={() => openEditModal(item)}
                                                    >
                                                        <i className="bi bi-pencil" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        onClick={() => {
                                                            setDeletingRecord({ id: item.id, itemName: item.name });
                                                            setShowDeleteModal(true);
                                                        }}
                                                    >
                                                        <i className="bi bi-trash" />
                                                    </Button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td colSpan={4} className="text-muted fst-italic small">
                                                    Not configured
                                                </td>
                                                <td>
                                                    <Badge bg="secondary">Not set</Badge>
                                                </td>
                                                <td className="text-end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        onClick={() => openAddModal(item)}
                                                    >
                                                        <i className="bi bi-plus-circle me-1" />
                                                        Add Config
                                                    </Button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingRecord ? "Edit Purchase Config" : "Add Purchase Config"}
                        {modalItem && (
                            <div className="fs-6 text-muted fw-normal mt-1">
                                {modalItem.name} · {modalItem.code}
                            </div>
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {formError && (
                        <Alert variant="danger" className="py-2">
                            {formError}
                        </Alert>
                    )}
                    <Form.Group className="mb-3">
                        <Form.Label className="d-flex align-items-center gap-1">
                            Pack Label <span className="text-danger">*</span>
                            <HelpPopover id="pack-label">
                                Human-readable name for one purchased unit of this item.
                                Examples: <em>Box of 300</em>, <em>25 kg Bag</em>, <em>Liter</em>.
                            </HelpPopover>
                        </Form.Label>
                        <Form.Control
                            value={formLabel}
                            onChange={(e) => setFormLabel(e.target.value)}
                            disabled={saving}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="d-flex align-items-center gap-1">
                            Pack Quantity <span className="text-danger">*</span>
                            <HelpPopover id="pack-qty">
                                How many stock units are in one pack. Use <strong>1</strong> for
                                variable quantities (liquids, weight-based items).
                            </HelpPopover>
                        </Form.Label>
                        <Form.Control
                            type="number"
                            min="0.0001"
                            step="any"
                            value={formQty}
                            onChange={(e) => setFormQty(e.target.value)}
                            disabled={saving}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="d-flex align-items-center gap-1">
                            Unit of Measure
                            <HelpPopover id="uom">
                                Optional display label for the base stock unit (e.g. <em>kg</em>,{" "}
                                <em>pieces</em>). Manage available units under Admin &rsaquo; Settings.
                            </HelpPopover>
                        </Form.Label>
                        <Form.Select
                            value={uomSelectValue}
                            onChange={(e) => {
                                if (e.target.value === "__custom__") {
                                    setFormUom("");
                                } else {
                                    setFormUom(e.target.value);
                                }
                            }}
                            disabled={saving}
                        >
                            <option value="">— select a unit —</option>
                            {uomGroups.map((group) => (
                                <optgroup key={group.label} label={group.label}>
                                    {group.units.map((u) => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </optgroup>
                            ))}
                            <option value="__custom__">Other (type custom)…</option>
                        </Form.Select>
                        {(uomSelectValue === "__custom__" || isCustomUom) && (
                            <Form.Control
                                className="mt-2"
                                placeholder="Type custom unit…"
                                value={formUom}
                                onChange={(e) => setFormUom(e.target.value)}
                                disabled={saving}
                            />
                        )}
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="d-flex align-items-center gap-1">
                            Default Price (per pack)
                            <HelpPopover id="default-price">
                                Optional. Pre-fills the unit price when this item is added to a
                                purchase order.
                            </HelpPopover>
                        </Form.Label>
                        <Form.Control
                            type="number"
                            min="0"
                            step="0.01"
                            value={formPrice}
                            onChange={(e) => setFormPrice(e.target.value)}
                            disabled={saving}
                        />
                    </Form.Group>
                    {editingRecord && (
                        <Form.Check
                            type="switch"
                            id="active-switch"
                            label="Active"
                            checked={formActive}
                            onChange={(e) => setFormActive(e.target.checked)}
                            disabled={saving}
                        />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving}>
                        {saving ? <Spinner size="sm" animation="border" className="me-1" /> : null}
                        {editingRecord ? "Save Changes" : "Add Config"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Confirmation */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
                <Modal.Header closeButton>
                    <Modal.Title>Remove Config</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Remove purchase config for <strong>{deletingRecord?.itemName}</strong>? This will
                    prevent the item from being added to new purchase orders until a config is re-added.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
                        {deleting ? <Spinner size="sm" animation="border" className="me-1" /> : null}
                        Remove
                    </Button>
                </Modal.Footer>
            </Modal>
        </RoleAwareLayout>
    );
}