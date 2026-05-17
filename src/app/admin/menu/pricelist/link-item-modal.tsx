"use client";
import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";

interface SearchItem {
  id: number;
  name: string;
  code: string;
  price?: number;
  category?: { id: string; name: string } | null;
}

interface LinkItemModalProps {
  show: boolean;
  pricelistId: number;
  onHide: () => void;
  onLinked: () => void;
}

export default function LinkItemModal({ show, pricelistId, onHide, onLinked }: LinkItemModalProps) {
  const apiCall = useApiCall();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [price, setPrice] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!show) {
      setSearch("");
      setResults([]);
      setSelected(null);
      setPrice("");
      setError(null);
    }
  }, [show]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiCall(`/api/menu/items?search=${encodeURIComponent(search.trim())}`);
        if (res.status === 200) {
          setResults(Array.isArray(res.data) ? res.data.slice(0, 20) : []);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [search]);

  const handleSelect = (item: SearchItem) => {
    setSelected(item);
    setPrice(item.price != null ? String(item.price) : "");
    setError(null);
  };

  const handleLink = async () => {
    if (!selected) return;
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError("Enter a valid price");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiCall(
        `/api/menu/pricelists/${pricelistId}/items/${selected.id}`,
        { method: "POST", body: JSON.stringify({ price: parsedPrice }) }
      );
      if (res.status === 201) {
        onLinked();
        onHide();
      } else if (res.status === 409) {
        setError("This item is already in the pricelist");
      } else {
        setError(res.error || "Failed to add item");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Link Existing Item to Pricelist</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <Form.Group className="mb-3">
          <Form.Label>Search items</Form.Label>
          <Form.Control
            type="text"
            placeholder="Type item name or code…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
            autoFocus
          />
        </Form.Group>

        {searching && <div className="text-center py-2"><Spinner size="sm" /> Searching…</div>}

        {!selected && results.length > 0 && (
          <div className="list-group mb-3" style={{ maxHeight: 280, overflowY: "auto" }}>
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => handleSelect(item)}
              >
                <div>
                  <strong>{item.name}</strong>
                  {item.code && <span className="text-muted ms-2 small">({item.code})</span>}
                  {item.category?.name && (
                    <span className="badge bg-secondary ms-2" style={{ fontSize: "0.7rem" }}>
                      {item.category.name}
                    </span>
                  )}
                </div>
                <span className="text-muted small">KES {item.price ?? "—"}</span>
              </button>
            ))}
          </div>
        )}

        {!selected && search.trim() && !searching && results.length === 0 && (
          <p className="text-muted small">No items found.</p>
        )}

        {selected && (
          <div className="border rounded p-3">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <strong>{selected.name}</strong>
                {selected.code && <span className="text-muted ms-2">({selected.code})</span>}
                {selected.category?.name && (
                  <span className="badge bg-secondary ms-2">{selected.category.name}</span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setSelected(null)}
              >
                Change
              </button>
            </div>
            <Form.Group>
              <Form.Label>Price for this pricelist <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price"
              />
            </Form.Group>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
        <Button variant="success" onClick={handleLink} disabled={!selected || saving}>
          {saving ? <><Spinner size="sm" className="me-1" />Adding…</> : "Add to Pricelist"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
