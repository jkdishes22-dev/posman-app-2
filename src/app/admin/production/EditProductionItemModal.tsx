"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import FilterDatePicker from "../../shared/FilterDatePicker";
import { todayEAT } from "../../shared/eatDate";
import { format } from "date-fns";
import {
    loadIssueProductionItemOptions,
    type IssueProductionItemOption,
} from "../../shared/production/loadIssueProductionOptions";

interface ProductionItemRow {
    id: number;
    item: { id: number; name: string; code: string };
    quantity_produced: number;
    issued_at: string | null;
    notes: string | null;
}

interface Props {
    show: boolean;
    onHide: () => void;
    onSaved: () => void;
    productionId: number;
    item: ProductionItemRow | null;
}

export default function EditProductionItemModal({ show, onHide, onSaved, productionId, item }: Props) {
    const apiCall = useApiCall();

    const [options, setOptions] = useState<IssueProductionItemOption[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    const [selectedId, setSelectedId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [notes, setNotes] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const loadItems = useCallback(async () => {
        setLoadingItems(true);
        const { options: next } = await loadIssueProductionItemOptions(apiCall);
        setOptions(next);
        setLoadingItems(false);
    }, [apiCall]);

    useEffect(() => {
        if (show && item) {
            setSelectedId(String(item.item.id));
            setQuantity(String(item.quantity_produced));
            setIssueDate(item.issued_at ? format(new Date(item.issued_at), "yyyy-MM-dd") : todayEAT());
            setNotes(item.notes ?? "");
            setError(null);
            setFormError(null);
            void loadItems();
        }
    }, [show, item, loadItems]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setError(null);
        if (!selectedId) { setFormError("Please select an item."); return; }
        const qty = Number(quantity);
        if (!qty || qty <= 0) { setFormError("Quantity must be a positive number."); return; }

        setSubmitting(true);
        try {
            const result = await apiCall(`/api/production/runs/${productionId}/items/${item!.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    item_id: Number(selectedId),
                    quantity_produced: qty,
                    notes: notes.trim() || null,
                    issue_date: issueDate || null,
                }),
            });
            if (result.status >= 200 && result.status < 300) {
                onSaved();
                onHide();
            } else {
                setError((result as any).error || "Failed to update item");
            }
        } catch {
            setError("Network error occurred.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton className="bg-warning text-dark">
                <Modal.Title className="fw-bold">
                    <i className="bi bi-pencil-square me-2" />
                    Edit Issued Item
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body className="py-4">
                    <ErrorDisplay error={error} onDismiss={() => setError(null)} />
                    {formError && (
                        <Alert variant="danger" dismissible onClose={() => setFormError(null)}>{formError}</Alert>
                    )}
                    {item && (
                        <Alert variant="info" className="py-2 small">
                            <i className="bi bi-info-circle me-1" />
                            Changing item or quantity will reverse the original inventory entry and create a corrected one.
                        </Alert>
                    )}

                    <Form.Group controlId="edit-item" className="mb-3">
                        <Form.Label>Item <span className="text-danger">*</span></Form.Label>
                        {loadingItems ? (
                            <div className="text-muted small py-1">
                                <Spinner animation="border" size="sm" className="me-1" />Loading items…
                            </div>
                        ) : (
                            <Form.Select
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                required
                            >
                                <option value="">Select item</option>
                                {options.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                        {o.name}{o.code ? ` (${o.code})` : ""} — Available: {o.available}
                                    </option>
                                ))}
                            </Form.Select>
                        )}
                    </Form.Group>

                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group controlId="edit-qty" className="mb-3">
                                <Form.Label>Quantity <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    required
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <FilterDatePicker
                                id="edit-date"
                                label="Issue Date *"
                                value={issueDate}
                                onChange={setIssueDate}
                                allowEmpty={false}
                                maxDate={new Date()}
                                wrapperClassName="mb-3"
                            />
                        </div>
                    </div>

                    <Form.Group controlId="edit-notes" className="mb-3">
                        <Form.Label>Notes (optional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={submitting}>Cancel</Button>
                    <Button variant="warning" type="submit" disabled={submitting || loadingItems}>
                        {submitting
                            ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</>
                            : <><i className="bi bi-check-circle me-1" />Save Changes</>}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
