"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Form, Badge, Table } from "react-bootstrap";
import { useApiCall } from "src/app/utils/apiUtils";
import { ApiErrorResponse } from "src/app/utils/errorUtils";
import ErrorDisplay from "src/app/components/ErrorDisplay";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";

interface ReopenReason {
    id: number;
    reason_key: string;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
}

const SupervisorBillSettingsPage = () => {
    const apiCall = useApiCall();
    const [reasons, setReasons] = useState<ReopenReason[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [selectedReason, setSelectedReason] = useState<ReopenReason | null>(null);
    const [formData, setFormData] = useState({
        reason_key: "",
        name: "",
        description: "",
        is_active: true,
        sort_order: 0
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchReasons();
    }, []);

    const fetchReasons = async () => {
        try {
            setLoading(true);
            setError(null);
            setErrorDetails(null);

            const result = await apiCall("/api/bills/reopen-reasons?includeInactive=true");

            if (result.status === 200) {
                setReasons(result.data.reasons || []);
            } else {
                setError(result.error || "Failed to fetch reopen reasons");
                setErrorDetails(result.errorDetails || null);
                setReasons([]);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setReasons([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setModalMode("add");
        setSelectedReason(null);
        setFormData({
            reason_key: "",
            name: "",
            description: "",
            is_active: true,
            sort_order: 0
        });
        setFormError(null);
        setShowModal(true);
    };

    const handleEdit = (reason: ReopenReason) => {
        setModalMode("edit");
        setSelectedReason(reason);
        setFormData({
            reason_key: reason.reason_key,
            name: reason.name,
            description: reason.description || "",
            is_active: reason.is_active,
            sort_order: reason.sort_order
        });
        setFormError(null);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this reopen reason?")) {
            return;
        }

        try {
            const result = await apiCall(`/api/bills/reopen-reasons?id=${id}`, {
                method: "DELETE"
            });

            if (result.status === 200) {
                await fetchReasons();
            } else {
                setError(result.error || "Failed to delete reopen reason");
                setErrorDetails(result.errorDetails || null);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        }
    };

    const handleToggleStatus = async (reason: ReopenReason) => {
        try {
            const result = await apiCall(`/api/bills/reopen-reasons?id=${reason.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    is_active: !reason.is_active
                })
            });

            if (result.status === 200) {
                await fetchReasons();
            } else {
                setError(result.error || "Failed to update reopen reason status");
                setErrorDetails(result.errorDetails || null);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        }
    };

    const handleSave = async () => {
        setFormError(null);

        // Validation
        if (!formData.reason_key.trim()) {
            setFormError("Reason key is required");
            return;
        }
        if (!formData.name.trim()) {
            setFormError("Name is required");
            return;
        }

        // Validate reason_key format (should be lowercase with underscores)
        const keyPattern = /^[a-z0-9_]+$/;
        if (!keyPattern.test(formData.reason_key)) {
            setFormError("Reason key must be lowercase letters, numbers, and underscores only");
            return;
        }

        setSaving(true);

        try {
            if (modalMode === "add") {
                const result = await apiCall("/api/bills/reopen-reasons", {
                    method: "POST",
                    body: JSON.stringify(formData)
                });

                if (result.status === 201) {
                    setShowModal(false);
                    await fetchReasons();
                } else {
                    setFormError(result.error || "Failed to create reopen reason");
                }
            } else {
                const result = await apiCall(`/api/bills/reopen-reasons?id=${selectedReason?.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(formData)
                });

                if (result.status === 200) {
                    setShowModal(false);
                    await fetchReasons();
                } else {
                    setFormError(result.error || "Failed to update reopen reason");
                }
            }
        } catch (error) {
            setFormError("Network error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedReason(null);
        setFormData({
            reason_key: "",
            name: "",
            description: "",
            is_active: true,
            sort_order: 0
        });
        setFormError(null);
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="h3 mb-0">Bill Settings</h1>
                    <Button variant="primary" onClick={handleAdd}>
                        <i className="bi bi-plus-circle me-2"></i>
                        Add Reopen Reason
                    </Button>
                </div>

                <ErrorDisplay
                    error={error}
                    errorDetails={errorDetails}
                    onDismiss={() => {
                        setError(null);
                        setErrorDetails(null);
                    }}
                />

                <div className="card shadow-sm">
                    <div className="card-header bg-light">
                        <h5 className="mb-0 fw-bold">
                            <i className="bi bi-list-ul me-2 text-primary"></i>
                            Reopen Reasons
                        </h5>
                    </div>
                    <div className="card-body">
                        {loading ? (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : reasons.length === 0 ? (
                            <div className="text-center text-muted py-4">
                                <i className="bi bi-inbox display-4"></i>
                                <p className="mt-2">No reopen reasons found</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table hover>
                                    <thead className="table-light">
                                        <tr>
                                            <th>Sort Order</th>
                                            <th>Reason Key</th>
                                            <th>Name</th>
                                            <th>Description</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reasons.map((reason) => (
                                            <tr key={reason.id}>
                                                <td>{reason.sort_order}</td>
                                                <td>
                                                    <code className="text-muted">{reason.reason_key}</code>
                                                </td>
                                                <td className="fw-semibold">{reason.name}</td>
                                                <td>
                                                    <span className="text-muted small">
                                                        {reason.description || <em>No description</em>}
                                                    </span>
                                                </td>
                                                <td>
                                                    <Badge bg={reason.is_active ? "success" : "secondary"}>
                                                        {reason.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            onClick={() => handleEdit(reason)}
                                                            title="Edit"
                                                        >
                                                            <i className="bi bi-pencil"></i>
                                                        </Button>
                                                        <Button
                                                            variant={reason.is_active ? "outline-warning" : "outline-success"}
                                                            size="sm"
                                                            onClick={() => handleToggleStatus(reason)}
                                                            title={reason.is_active ? "Deactivate" : "Activate"}
                                                        >
                                                            <i className={`bi bi-${reason.is_active ? "eye-slash" : "eye"}`}></i>
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDelete(reason.id)}
                                                            title="Delete"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add/Edit Modal */}
                <Modal show={showModal} onHide={handleCloseModal} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {modalMode === "add" ? "Add Reopen Reason" : "Edit Reopen Reason"}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {formError && (
                            <div className="alert alert-danger" role="alert">
                                {formError}
                            </div>
                        )}

                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Reason Key <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.reason_key}
                                    onChange={(e) => setFormData({ ...formData, reason_key: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                                    placeholder="e.g., payment_disputed"
                                    disabled={modalMode === "edit"}
                                />
                                <Form.Text className="text-muted">
                                    Lowercase letters, numbers, and underscores only. Cannot be changed after creation.
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>
                                    Name <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Payment Disputed"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of this reopen reason"
                                />
                            </Form.Group>

                            <div className="row">
                                <div className="col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Sort Order</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={formData.sort_order}
                                            onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                            min="0"
                                        />
                                        <Form.Text className="text-muted">
                                            Lower numbers appear first in dropdowns
                                        </Form.Text>
                                    </Form.Group>
                                </div>
                                <div className="col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Check
                                            type="checkbox"
                                            label="Active"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                        <Form.Text className="text-muted">
                                            Inactive reasons won't appear in dropdowns
                                        </Form.Text>
                                    </Form.Group>
                                </div>
                            </div>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Saving...
                                </>
                            ) : (
                                modalMode === "add" ? "Add Reason" : "Save Changes"
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </RoleAwareLayout>
    );
};

export default SupervisorBillSettingsPage;

