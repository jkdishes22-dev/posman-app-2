"use client";
import React, { useState, useEffect } from "react";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Card,
    Table,
    Badge,
    Button,
    Form,
    Modal,
    Spinner,
    Alert,
    Row,
    Col,
} from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import CollapsibleFilterSectionCard from "../../../components/CollapsibleFilterSectionCard";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import { AuthError } from "../../../types/types";
import { format } from "date-fns";
import { useTooltips } from "../../../hooks/useTooltips";

interface ProductionPreparation {
    id: number;
    item_id: number;
    item: {
        id: number;
        name: string;
        code: string;
    };
    quantity_prepared: number;
    status: "pending" | "approved" | "rejected" | "issued";
    prepared_by: number;
    prepared_by_user?: {
        id: number;
        firstName: string;
        lastName: string;
    };
    prepared_at: string | null;
    issued_by: number | null;
    issued_by_user?: {
        id: number;
        firstName: string;
        lastName: string;
    } | null;
    issued_at: string | null;
    notes: string | null;
    rejection_reason: string | null;
    created_at: string;
}

export default function SupervisorPreparationsPage() {
    const apiCall = useApiCall();

    const [preparations, setPreparations] = useState<ProductionPreparation[]>([]);
    const [filteredPreparations, setFilteredPreparations] = useState<ProductionPreparation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [authError, setAuthError] = useState<AuthError>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "issued">("all");
    const [searchTerm, setSearchTerm] = useState<string>("");

    // Modal states
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedPreparation, setSelectedPreparation] = useState<ProductionPreparation | null>(null);
    const [rejectionReason, setRejectionReason] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

    const preparationFiltersDirty =
        statusFilter !== "all" || searchTerm.trim() !== "";

    const clearPreparationFilters = () => {
        setStatusFilter("all");
        setSearchTerm("");
    };

    useEffect(() => {
        fetchPreparations();
    }, [apiCall]);

    useEffect(() => {
        filterPreparations();
    }, [preparations, statusFilter, searchTerm]);

    const fetchPreparations = async () => {
        setIsLoading(true);
        setError(null);
        setErrorDetails(null);

        try {
            const params = new URLSearchParams();
            if (statusFilter !== "all") {
                params.append("status", statusFilter);
            }
            params.append("limit", "100");

            const result = await apiCall(`/api/production/preparations?${params.toString()}`);
            if (result.status >= 200 && result.status < 300) {
                const data = result.data?.preparations || [];
                setPreparations(data);
                setFilteredPreparations(data);
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setError(result.error || "Failed to fetch preparations");
                setErrorDetails(result.errorDetails);
                setPreparations([]);
                setFilteredPreparations([]);
            }
        } catch (error: any) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setPreparations([]);
            setFilteredPreparations([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterPreparations = () => {
        let filtered = [...preparations];

        // Filter by status
        if (statusFilter !== "all") {
            filtered = filtered.filter((prep) => prep.status === statusFilter);
        }

        // Filter by search term (item name or code, chef name)
        if (searchTerm.trim().length > 0) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (prep) =>
                    prep.item.name.toLowerCase().includes(searchLower) ||
                    prep.item.code.toLowerCase().includes(searchLower) ||
                    prep.prepared_by_user?.firstName.toLowerCase().includes(searchLower) ||
                    prep.prepared_by_user?.lastName.toLowerCase().includes(searchLower)
            );
        }

        setFilteredPreparations(filtered);
    };

    const handleApprove = async (preparationId: number) => {
        setIsProcessing(true);
        setError(null);
        setErrorDetails(null);
        setSuccessMessage(null);

        try {
            const result = await apiCall(`/api/production/preparations/${preparationId}/approve`, {
                method: "POST",
            });

            if (result.status >= 200 && result.status < 300) {
                setSuccessMessage("Preparation approved and items added to inventory successfully.");
                await fetchPreparations();
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setError(result.error || "Failed to approve preparation");
                setErrorDetails(result.errorDetails);
            }
        } catch (error: any) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedPreparation || !rejectionReason.trim()) {
            return;
        }

        setIsProcessing(true);
        setError(null);
        setErrorDetails(null);
        setSuccessMessage(null);

        try {
            const result = await apiCall(`/api/production/preparations/${selectedPreparation.id}/reject`, {
                method: "POST",
                body: JSON.stringify({ rejection_reason: rejectionReason }),
            });

            if (result.status >= 200 && result.status < 300) {
                setSuccessMessage("Preparation rejected successfully.");
                setShowRejectModal(false);
                setSelectedPreparation(null);
                setRejectionReason("");
                await fetchPreparations();
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setError(result.error || "Failed to reject preparation");
                setErrorDetails(result.errorDetails);
            }
        } catch (error: any) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setIsProcessing(false);
        }
    };

    const openRejectModal = (preparation: ProductionPreparation) => {
        setSelectedPreparation(preparation);
        setRejectionReason("");
        setShowRejectModal(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge bg="warning">Pending</Badge>;
            case "approved":
                return <Badge bg="info">Approved</Badge>;
            case "rejected":
                return <Badge bg="danger">Rejected</Badge>;
            case "issued":
                return <Badge bg="success">Issued</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <RoleAwareLayout>
                <div className="container-fluid">
                    <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
                        <Spinner animation="border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                    </div>
                </div>
            </RoleAwareLayout>
        );
    }

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <PageHeaderStrip>
                    <h1 className="h4 mb-0 fw-bold">
                        <i className="bi bi-clipboard-check me-2" aria-hidden></i>
                        Production Preparations
                        <i
                            className="bi bi-question-circle ms-2"
                            style={{ cursor: "help", fontSize: "0.9rem" }}
                            data-bs-toggle="tooltip"
                            data-bs-placement="bottom"
                            title="Review and approve production preparations"
                        ></i>
                    </h1>
                    <p className="mb-0 mt-2 small text-white-50">Review and approve chef preparation requests</p>
                </PageHeaderStrip>

                <ErrorDisplay
                    error={error}
                    errorDetails={errorDetails}
                    onDismiss={() => {
                        setError(null);
                        setErrorDetails(null);
                    }}
                />

                {authError && (
                    <Alert variant="danger" dismissible onClose={() => setAuthError(null)}>
                        <Alert.Heading>Access Denied</Alert.Heading>
                        <p>{authError.message}</p>
                    </Alert>
                )}

                {successMessage && (
                    <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
                        {successMessage}
                    </Alert>
                )}

                <CollapsibleFilterSectionCard>
                        <Form
                            noValidate
                            onSubmit={(e) => {
                                e.preventDefault();
                            }}
                        >
                            <Row className="g-3 align-items-end">
                                <Col md={4}>
                                    <Form.Group controlId="statusFilter">
                                        <Form.Label>Status</Form.Label>
                                        <Form.Select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as any)}
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="issued">Issued</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group controlId="searchTerm">
                                        <Form.Label>Search</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Search by item name, code, or chef name"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={2} className="d-flex justify-content-md-end">
                                    <Button
                                        type="button"
                                        variant="outline-secondary"
                                        size="sm"
                                        className="text-nowrap"
                                        disabled={!preparationFiltersDirty}
                                        onClick={clearPreparationFilters}
                                    >
                                        <i className="bi bi-x-lg me-1" aria-hidden />
                                        Clear filters
                                    </Button>
                                </Col>
                            </Row>
                        </Form>
                </CollapsibleFilterSectionCard>

                <Card className="shadow-sm">
                    <Card.Header className="bg-light fw-bold d-flex justify-content-between align-items-center">
                        <span>Preparations ({filteredPreparations.length})</span>
                        <Button variant="outline-primary" size="sm" onClick={fetchPreparations}>
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Refresh
                        </Button>
                    </Card.Header>
                    <Card.Body>
                        {filteredPreparations.length === 0 ? (
                            <Alert variant="info">No preparations found.</Alert>
                        ) : (
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Item</th>
                                        <th>Quantity</th>
                                        <th>Prepared By</th>
                                        <th>Prepared At</th>
                                        <th>Status</th>
                                        <th>Issued By</th>
                                        <th>Issued At</th>
                                        <th>Notes</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPreparations.map((prep) => (
                                        <tr key={prep.id}>
                                            <td>{prep.id}</td>
                                            <td>
                                                <div className="fw-semibold">{prep.item.name}</div>
                                                <div className="text-muted small">{prep.item.code}</div>
                                            </td>
                                            <td>{prep.quantity_prepared}</td>
                                            <td>
                                                {prep.prepared_by_user
                                                    ? `${prep.prepared_by_user.firstName} ${prep.prepared_by_user.lastName}`
                                                    : "N/A"}
                                            </td>
                                            <td>
                                                {prep.prepared_at
                                                    ? format(new Date(prep.prepared_at), "MMM dd, yyyy HH:mm")
                                                    : "N/A"}
                                            </td>
                                            <td>{getStatusBadge(prep.status)}</td>
                                            <td>
                                                {prep.issued_by_user
                                                    ? `${prep.issued_by_user.firstName} ${prep.issued_by_user.lastName}`
                                                    : prep.issued_by
                                                    ? "N/A"
                                                    : "-"}
                                            </td>
                                            <td>
                                                {prep.issued_at
                                                    ? format(new Date(prep.issued_at), "MMM dd, yyyy HH:mm")
                                                    : "-"}
                                            </td>
                                            <td>
                                                {prep.notes ? (
                                                    <span title={prep.notes} className="text-truncate d-inline-block" style={{ maxWidth: "150px" }}>
                                                        {prep.notes}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                                {prep.rejection_reason && (
                                                    <div className="text-danger small mt-1">
                                                        <strong>Rejected:</strong> {prep.rejection_reason}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {prep.status === "pending" && (
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            onClick={() => handleApprove(prep.id)}
                                                            disabled={isProcessing}
                                                        >
                                                            <i className="bi bi-check-circle me-1"></i>
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => openRejectModal(prep)}
                                                            disabled={isProcessing}
                                                        >
                                                            <i className="bi bi-x-circle me-1"></i>
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>

                {/* Reject Modal */}
                <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Reject Preparation</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedPreparation && (
                            <>
                                <p>
                                    <strong>Item:</strong> {selectedPreparation.item.name} ({selectedPreparation.item.code})
                                </p>
                                <p>
                                    <strong>Quantity:</strong> {selectedPreparation.quantity_prepared}
                                </p>
                                <Form.Group className="mt-3">
                                    <Form.Label>Rejection Reason <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Enter reason for rejection"
                                        required
                                    />
                                </Form.Group>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleReject}
                            disabled={!rejectionReason.trim() || isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Rejecting...
                                </>
                            ) : (
                                "Reject"
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </RoleAwareLayout>
    );
}

