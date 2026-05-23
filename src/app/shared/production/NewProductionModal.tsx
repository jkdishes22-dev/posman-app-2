"use client";
import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import { format } from "date-fns";

interface Props {
    show: boolean;
    onHide: () => void;
    onCreated: (production: { id: number; name: string; status: string }) => void;
}

function buildDefaultName(): string {
    return `Production for ${format(new Date(), "EEE, MMM do")}`;
}

export default function NewProductionModal({ show, onHide, onCreated }: Props) {
    const apiCall = useApiCall();
    const [name, setName] = useState(buildDefaultName);
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (show) {
            setName(buildDefaultName());
            setDescription("");
            setError(null);
        }
    }, [show]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError("Name is required"); return; }
        setSubmitting(true);
        setError(null);
        try {
            const result = await apiCall("/api/production/runs", {
                method: "POST",
                body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
            });
            if (result.status >= 200 && result.status < 300) {
                onCreated(result.data as any);
                onHide();
            } else {
                setError((result as any).error || "Failed to create production");
            }
        } catch {
            setError("Network error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title className="fw-bold">
                    <i className="bi bi-plus-circle me-2" />
                    New Production
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
                    <Form.Group controlId="prod-name" className="mb-3">
                        <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                        <Form.Text className="text-muted">
                            E.g. "Production for Mon, May 18th" or "Morning Batch"
                        </Form.Text>
                    </Form.Group>
                    <Form.Group controlId="prod-desc">
                        <Form.Label>Description (optional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Any notes about this production run"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" type="submit" disabled={submitting || !name.trim()}>
                        {submitting ? <><Spinner animation="border" size="sm" className="me-2" />Creating…</> : "Create Production"}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
