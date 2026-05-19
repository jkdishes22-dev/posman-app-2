"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Modal, Button, Spinner, Form } from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";

interface CatalogItem {
  id: number;
  name: string;
  code?: string;
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
  const [allItems, setAllItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!show) {
      setCheckedIds(new Set());
      setResultMsg(null);
      setFilter("");
      return;
    }
    setLoading(true);
    apiCall("/api/menu/items")
      .then(res => {
        if (res.status === 200) {
          const raw = Array.isArray(res.data) ? res.data : [];
          const seen = new Map<number, CatalogItem>();
          for (const item of raw) {
            if (!seen.has(item.id)) {
              seen.set(item.id, {
                id: item.id,
                name: item.name,
                code: item.code,
                price: item.price ?? 0,
                category: item.category ?? null,
              });
            }
          }
          setAllItems(
            Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
          );
        }
      })
      .finally(() => setLoading(false));
  }, [show, apiCall]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      it => it.name.toLowerCase().includes(q) || (it.code ?? "").toLowerCase().includes(q)
    );
  }, [allItems, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: CatalogItem[] }>();
    for (const item of filtered) {
      const key = item.category?.id ?? "__none__";
      const name = item.category?.name ?? "Uncategorized";
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const toggleItem = (id: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const allFilteredChecked =
    filtered.length > 0 && filtered.every(i => checkedIds.has(i.id));

  const toggleAllFiltered = () => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (allFilteredChecked) {
        filtered.forEach(i => next.delete(i.id));
      } else {
        filtered.forEach(i => next.add(i.id));
      }
      return next;
    });
  };

  const handleLink = async () => {
    const toLink = allItems.filter(i => checkedIds.has(i.id));
    if (!toLink.length) return;
    setSaving(true);
    setResultMsg(null);
    let linked = 0;
    let skipped = 0;
    for (const item of toLink) {
      const res = await apiCall(
        `/api/menu/pricelists/${pricelistId}/items/${item.id}`,
        { method: "POST", body: JSON.stringify({ price: item.price ?? 0 }) }
      );
      if (res.status === 201) linked++;
      else if (res.status === 409) skipped++;
    }
    setSaving(false);
    if (linked > 0) onLinked();
    if (linked === 0 && skipped > 0) {
      setResultMsg("All selected items are already in this pricelist.");
      return;
    }
    if (skipped > 0) {
      setResultMsg(`${linked} item(s) linked. ${skipped} already in pricelist.`);
      return;
    }
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-link-45deg me-2 text-primary"></i>
          Link Items to Pricelist
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {resultMsg && (
          <div className="alert alert-warning m-3 mb-0 py-2 small">{resultMsg}</div>
        )}
        <div className="p-3 border-bottom">
          <Form.Control
            type="text"
            size="sm"
            placeholder="Filter by name or code…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            autoFocus
          />
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">
            <Spinner size="sm" className="me-2" />Loading items…
          </div>
        ) : allItems.length === 0 ? (
          <div className="text-muted text-center py-5">No items in catalog.</div>
        ) : (
          <>
            <div className="px-3 py-2 border-bottom d-flex align-items-center bg-light">
              <Form.Check
                type="checkbox"
                id="link-select-all"
                checked={allFilteredChecked}
                onChange={toggleAllFiltered}
                label={
                  <span className="small fw-semibold">
                    Select all ({filtered.length})
                  </span>
                }
              />
              {checkedIds.size > 0 && (
                <span className="ms-auto badge bg-primary">{checkedIds.size} selected</span>
              )}
            </div>
            <div>
              {grouped.map(group => (
                <div key={group.name}>
                  <div className="px-3 py-1 border-bottom text-muted small fw-semibold bg-light sticky-top" style={{ top: 0 }}>
                    <i className="bi bi-grid me-1"></i>{group.name}
                  </div>
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className="d-flex align-items-center px-3 py-2 border-bottom"
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleItem(item.id)}
                    >
                      <Form.Check
                        type="checkbox"
                        checked={checkedIds.has(item.id)}
                        onChange={() => toggleItem(item.id)}
                        onClick={e => e.stopPropagation()}
                        className="me-3 flex-shrink-0"
                      />
                      <div className="flex-grow-1">
                        <span className="fw-semibold">{item.name}</span>
                        {item.code && (
                          <span className="text-muted ms-2 small">({item.code})</span>
                        )}
                      </div>
                      {item.price != null && (
                        <span className="text-muted small ms-3 flex-shrink-0">
                          KES {Number(item.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
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
          disabled={checkedIds.size === 0 || saving}
        >
          {saving ? (
            <><Spinner size="sm" className="me-1" />Linking…</>
          ) : (
            `Link ${checkedIds.size} Item${checkedIds.size !== 1 ? "s" : ""}`
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
