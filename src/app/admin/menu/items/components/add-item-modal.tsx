"use client";
import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { useApiCall } from "src/app/utils/apiUtils";
import AppSelect from "src/app/components/AppSelect";

interface Category {
  id: number;
  name: string;
  status: string;
}

interface Pricelist {
  id: number;
  name: string;
  status: string;
}

interface AddItemModalProps {
  show: boolean;
  onHide: () => void;
  onAdded: () => void;
}

export default function AddItemModal({ show, onHide, onAdded }: AddItemModalProps) {
  const apiCall = useApiCall();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [isStock, setIsStock] = useState(false);
  const [allowNegativeInventory, setAllowNegativeInventory] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [pricelistId, setPricelistId] = useState("");
  const [price, setPrice] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      setName(""); setCode(""); setIsGroup(false); setIsStock(false);
      setAllowNegativeInventory(false); setCategoryId(""); setPricelistId("");
      setPrice(""); setError(null);
      return;
    }
    apiCall("/api/menu/categories").then((res) => {
      if (res.status === 200) setCategories(Array.isArray(res.data) ? res.data.filter((c: Category) => c.status === "active") : []);
    });
    apiCall("/api/menu/pricelists").then((res) => {
      if (res.status === 200) setPricelists(Array.isArray(res.data) ? res.data.filter((p: Pricelist) => p.status === "active") : []);
    });
  }, [show, apiCall]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Item name is required."); return; }
    if (!code.trim()) { setError("Item code is required."); return; }
    if (pricelistId && (price === "" || isNaN(Number(price)) || Number(price) < 0)) {
      setError("Enter a valid price for the selected pricelist."); return;
    }
    setSaving(true);
    setError(null);
    const res = await apiCall("/api/menu/items", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        code: code.trim(),
        isGroup,
        isStock,
        allowNegativeInventory,
        category: categoryId ? Number(categoryId) : null,
        pricelistId: pricelistId ? Number(pricelistId) : null,
        price: pricelistId ? Number(price) : 0,
      }),
    });
    setSaving(false);
    if (res.status === 201 || res.status === 200) {
      onAdded();
      onHide();
    } else {
      setError(res.error || "Failed to create item.");
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-plus-circle me-2 text-success"></i>
          Add Item
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            <i className="bi bi-exclamation-circle me-1"></i>{error}
          </div>
        )}
        <Form.Group className="mb-3" controlId="add-item-name">
          <Form.Label className="fw-semibold small">Name <span className="text-danger">*</span></Form.Label>
          <Form.Control size="sm" value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="Item name" />
        </Form.Group>
        <Form.Group className="mb-3" controlId="add-item-code">
          <Form.Label className="fw-semibold small">Code <span className="text-danger">*</span></Form.Label>
          <Form.Control size="sm" value={code} onChange={(e) => { setCode(e.target.value); setError(null); }} placeholder="Item code" />
        </Form.Group>
        <Form.Group className="mb-3" controlId="add-item-category">
          <Form.Label className="fw-semibold small">Category</Form.Label>
          <AppSelect
            id="add-item-category"
            size="sm"
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            value={categoryId}
            onChange={setCategoryId}
            placeholder="— No category —"
          />
        </Form.Group>
        <Form.Group className="mb-2" controlId="add-item-pricelist">
          <Form.Label className="fw-semibold small">Pricelist</Form.Label>
          <AppSelect
            id="add-item-pricelist"
            size="sm"
            options={pricelists.map((p) => ({ value: String(p.id), label: p.name }))}
            value={pricelistId}
            onChange={(v) => { setPricelistId(v); setError(null); }}
            placeholder="— No pricelist —"
          />
        </Form.Group>
        {pricelistId && (
          <Form.Group className="mb-3" controlId="add-item-price">
            <Form.Label className="fw-semibold small">Price (KES) <span className="text-danger">*</span></Form.Label>
            <Form.Control type="number" size="sm" min={0} step="0.01" placeholder="0.00" value={price} onChange={(e) => { setPrice(e.target.value); setError(null); }} style={{ maxWidth: 140 }} />
          </Form.Group>
        )}
        <hr className="my-2" />
        <Form.Group className="mb-1">
          <Form.Check type="switch" id="add-isGroup" label={<span className="small fw-semibold">Is Group (Platter)</span>} checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} />
        </Form.Group>
        <Form.Group className="mb-1">
          <Form.Check type="switch" id="add-isStock" label={<span className="small fw-semibold">Track Inventory (Stock Item)</span>} checked={isStock} onChange={(e) => setIsStock(e.target.checked)} />
        </Form.Group>
        <Form.Group>
          <Form.Check type="switch" id="add-allowNeg" label={<span className="small fw-semibold">Allow Negative Inventory</span>} checked={allowNegativeInventory} onChange={(e) => setAllowNegativeInventory(e.target.checked)} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
        <Button variant="success" onClick={handleSave} disabled={saving}>
          {saving ? <><Spinner size="sm" className="me-1" />Saving…</> : <><i className="bi bi-plus-circle me-1"></i>Add Item</>}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
