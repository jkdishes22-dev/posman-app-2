"use client";
import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { useApiCall } from "src/app/utils/apiUtils";

interface Pricelist {
  id: number;
  name: string;
  status?: string;
}

interface ExistingPrice {
  name: string;
  price: number;
}

interface LinkPricelistModalProps {
  show: boolean;
  itemId: number;
  itemName: string;
  linkedPricelistIds: number[];
  existingPrices?: ExistingPrice[];
  onHide: () => void;
  onLinked: (pricelistId: number, pricelistName: string, price: number) => void;
}

export default function LinkPricelistModal({
  show,
  itemId,
  itemName,
  linkedPricelistIds,
  existingPrices = [],
  onHide,
  onLinked,
}: LinkPricelistModalProps) {
  const apiCall = useApiCall();
  const priceInputRef = useRef<HTMLInputElement>(null);
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      setSelectedPricelistId("");
      setPrice("");
      setError(null);
      return;
    }
    setLoading(true);
    apiCall("/api/menu/pricelists")
      .then((res) => {
        if (res.status === 200) {
          const all: Pricelist[] = Array.isArray(res.data) ? res.data : [];
          setPricelists(all.filter((pl) => !linkedPricelistIds.includes(pl.id) && pl.status === "active"));
        }
      })
      .finally(() => setLoading(false));
  }, [show, apiCall, linkedPricelistIds]);

  const handleLink = async () => {
    if (!selectedPricelistId) {
      setError("Please select a pricelist.");
      return;
    }
    if (!price || isNaN(Number(price)) || Number(price) < 0) {
      setError("Please enter a valid price.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await apiCall(`/api/menu/pricelists/${selectedPricelistId}/items/${itemId}`, {
      method: "POST",
      body: JSON.stringify({ price: Number(price) }),
    });
    setSaving(false);
    if (res.status === 201 || res.status === 200) {
      const selected = pricelists.find((pl) => pl.id === Number(selectedPricelistId));
      onLinked(Number(selectedPricelistId), selected?.name ?? "", Number(price));
      onHide();
    } else if (res.status === 409) {
      setError("Item is already linked to this pricelist.");
    } else {
      setError(res.error || "Failed to link item to pricelist.");
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-link-45deg me-2 text-success"></i>
          Link to Pricelist
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small mb-3">
          Linking <strong>{itemName}</strong> to a pricelist with a specific price.
        </p>
        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            <i className="bi bi-exclamation-circle me-1"></i>
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-center py-3 text-muted">
            <Spinner size="sm" className="me-2" />Loading pricelists…
          </div>
        ) : pricelists.length === 0 ? (
          <div className="alert alert-info py-2 small" role="alert">
            <i className="bi bi-info-circle me-1"></i>
            No active pricelists available to link. Item may already be in all active pricelists.
          </div>
        ) : (
          <>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small">Pricelist</Form.Label>
              <Form.Select
                value={selectedPricelistId}
                onChange={(e) => { setSelectedPricelistId(e.target.value); setError(null); }}
                size="sm"
              >
                <option value="">Select pricelist…</option>
                {pricelists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label className="fw-semibold small">Price (KES)</Form.Label>
              {existingPrices.length > 0 && (
                <div className="mb-2 d-flex flex-wrap gap-1 align-items-center">
                  <span className="text-muted small me-1">Suggested:</span>
                  {existingPrices.map((ep) => (
                    <button
                      key={ep.name}
                      type="button"
                      className={`btn btn-sm py-0 px-2 ${price === String(ep.price) ? "btn-primary" : "btn-outline-secondary"}`}
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => {
                        setPrice(String(ep.price));
                        setError(null);
                        // Select-all so the user can immediately type a different value
                        setTimeout(() => priceInputRef.current?.select(), 0);
                      }}
                      title={`Use price from ${ep.name} — click then type to change`}
                    >
                      {ep.name}: KSh {Number(ep.price).toFixed(2)}
                    </button>
                  ))}
                </div>
              )}
              <Form.Control
                ref={priceInputRef}
                type="number"
                size="sm"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => { setPrice(e.target.value); setError(null); }}
              />
            </Form.Group>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={handleLink}
          disabled={saving || loading || pricelists.length === 0}
        >
          {saving ? (
            <><Spinner size="sm" className="me-1" />Linking…</>
          ) : (
            <><i className="bi bi-link-45deg me-1"></i>Link</>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
