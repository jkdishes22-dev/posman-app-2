"use client";
import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { useApiCall } from "src/app/utils/apiUtils";

export interface ItemPricelist {
  id: number;
  name: string;
  price: number;
  pricelistItemId: number;
}

export interface EditableItem {
  id: number;
  name: string;
  code: string;
  isGroup: boolean;
  isStock: boolean;
  allowNegativeInventory: boolean;
  category: { id: number; name: string } | null;
  pricelists: ItemPricelist[];
}

interface Category {
  id: number;
  name: string;
  status: string;
}

interface EditItemModalProps {
  show: boolean;
  item: EditableItem | null;
  onHide: () => void;
  onUpdated: (updated: EditableItem) => void;
}

export default function EditItemModal({ show, item, onHide, onUpdated }: EditItemModalProps) {
  const apiCall = useApiCall();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [isStock, setIsStock] = useState(false);
  const [allowNegativeInventory, setAllowNegativeInventory] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show || !item) return;
    setName(item.name);
    setCode(item.code);
    setIsGroup(item.isGroup);
    setIsStock(item.isStock);
    setAllowNegativeInventory(item.allowNegativeInventory ?? false);
    setCategoryId(item.category ? String(item.category.id) : "");
    const priceMap: Record<number, string> = {};
    for (const pl of item.pricelists) {
      priceMap[pl.pricelistItemId] = String(pl.price);
    }
    setPrices(priceMap);
    setError(null);

    apiCall("/api/menu/categories").then((res) => {
      if (res.status === 200)
        setCategories(Array.isArray(res.data) ? res.data.filter((c: Category) => c.status === "active") : []);
    });
  }, [show, item, apiCall]);

  const handleSave = async () => {
    if (!item) return;
    if (!name.trim()) { setError("Item name is required."); return; }
    if (!code.trim()) { setError("Item code is required."); return; }
    for (const val of Object.values(prices)) {
      if (val === "" || isNaN(Number(val)) || Number(val) < 0) {
        setError("All prices must be valid non-negative numbers.");
        return;
      }
    }

    setSaving(true);
    setError(null);

    const detailsRes = await apiCall(`/api/menu/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        id: item.id,
        name: name.trim(),
        code: code.trim(),
        isGroup,
        isStock,
        allowNegativeInventory,
        categoryId: categoryId ? Number(categoryId) : null,
      }),
    });

    if (detailsRes.status < 200 || detailsRes.status >= 300) {
      setSaving(false);
      setError(detailsRes.error || "Failed to update item details.");
      return;
    }

    for (const pl of item.pricelists) {
      const newPrice = Number(prices[pl.pricelistItemId]);
      if (newPrice === pl.price) continue;
      const priceRes = await apiCall(`/api/menu/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ id: item.id, pricelistItemId: pl.pricelistItemId, price: newPrice }),
      });
      if (priceRes.status < 200 || priceRes.status >= 300) {
        setSaving(false);
        setError(priceRes.error || `Failed to update price for ${pl.name}.`);
        return;
      }
    }

    setSaving(false);
    const selectedCategory = categories.find((c) => String(c.id) === categoryId) ?? null;
    onUpdated({
      ...item,
      name: name.trim(),
      code: code.trim(),
      isGroup,
      isStock,
      allowNegativeInventory,
      category: selectedCategory
        ? { id: selectedCategory.id, name: selectedCategory.name }
        : categoryId && item.category && String(item.category.id) === categoryId
          ? item.category
          : null,
      pricelists: item.pricelists.map((pl) => ({
        ...pl,
        price: Number(prices[pl.pricelistItemId] ?? pl.price),
      })),
    });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-pencil me-2 text-primary"></i>
          Edit Item
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            <i className="bi bi-exclamation-circle me-1"></i>{error}
          </div>
        )}

        <Form.Group className="mb-3" controlId="edit-item-name">
          <Form.Label className="fw-semibold small">Name <span className="text-danger">*</span></Form.Label>
          <Form.Control
            size="sm"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            placeholder="Item name"
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="edit-item-code">
          <Form.Label className="fw-semibold small">Code <span className="text-danger">*</span></Form.Label>
          <Form.Control
            size="sm"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(null); }}
            placeholder="Item code"
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="edit-item-category">
          <Form.Label className="fw-semibold small">Category</Form.Label>
          <Form.Select size="sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— No category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Form.Select>
        </Form.Group>

        <hr className="my-2" />

        <Form.Group className="mb-2">
          <Form.Check
            type="switch"
            id="edit-isGroup"
            label={<span className="small fw-semibold">Is Group (Platter)</span>}
            checked={isGroup}
            onChange={(e) => setIsGroup(e.target.checked)}
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Check
            type="switch"
            id="edit-isStock"
            label={<span className="small fw-semibold">Track Inventory (Stock Item)</span>}
            checked={isStock}
            onChange={(e) => setIsStock(e.target.checked)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="edit-allowNeg"
            label={<span className="small fw-semibold">Allow Negative Inventory</span>}
            checked={allowNegativeInventory}
            onChange={(e) => setAllowNegativeInventory(e.target.checked)}
          />
        </Form.Group>

        {item && item.pricelists.length > 0 && (
          <>
            <hr className="my-2" />
            <p className="fw-semibold small mb-2">Prices by pricelist</p>
            {item.pricelists.map((pl) => (
              <Form.Group key={pl.pricelistItemId} className="mb-2 d-flex align-items-center gap-2">
                <Form.Label className="mb-0 small text-muted" style={{ minWidth: 120 }}>
                  {pl.name}
                </Form.Label>
                <Form.Control
                  type="number"
                  size="sm"
                  min={0}
                  step="0.01"
                  value={prices[pl.pricelistItemId] ?? ""}
                  onChange={(e) => {
                    setPrices((prev) => ({ ...prev, [pl.pricelistItemId]: e.target.value }));
                    setError(null);
                  }}
                  style={{ maxWidth: 120 }}
                />
                <span className="small text-muted">KES</span>
              </Form.Group>
            ))}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving
            ? <><Spinner size="sm" className="me-1" />Saving…</>
            : <><i className="bi bi-check-circle me-1"></i>Save</>}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
