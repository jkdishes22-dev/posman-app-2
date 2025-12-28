"use client";
import React, { useState, useEffect } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Card,
    Form,
    Button,
    Spinner,
    Alert,
    Table,
    Badge,
    Row,
    Col,
    Pagination,
} from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../utils/errorUtils";
import { format } from "date-fns";
import IssueProductionModal from "./IssueProductionModal";
import DisposeItemModal from "./DisposeItemModal";

interface SellableItem {
    id: number;
    name: string;
    code: string;
    category: string;
    isStock: boolean;
}

interface ProductionPreparation {
    id: number;
    item: {
        id: number;
        name: string;
        code: string;
    };
    quantity_prepared: number;
    status: "pending" | "approved" | "rejected" | "issued";
    preparedByUser?: {
        id: number;
        firstName: string;
        lastName: string;
    };
    issuedByUser?: {
        id: number;
        firstName: string;
        lastName: string;
    };
    prepared_at: string;
    issued_at: string | null;
    notes: string | null;
    rejection_reason: string | null;
}

export default function AdminProductionPage() {
    const apiCall = useApiCall();

    // Modal state
    const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
    const [showDisposeModal, setShowDisposeModal] = useState<boolean>(false);
    const [selectedItemForDisposal, setSelectedItemForDisposal] = useState<{ id: number; name: string; code: string } | null>(null);

    // History state
    const [preparations, setPreparations] = useState<ProductionPreparation[]>([]);
    const [filteredPreparations, setFilteredPreparations] = useState<ProductionPreparation[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [historyErrorDetails, setHistoryErrorDetails] = useState<ApiErrorResponse | null>(null);

    // History filters
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "issued">("all");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [pageSize] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);

    useEffect(() => {
        fetchPreparations();
    }, [apiCall, page, pageSize, statusFilter, startDate, endDate]);

    useEffect(() => {
        filterPreparations();
    }, [preparations, statusFilter, searchTerm, startDate, endDate]);

    useEffect(() => {
        // Reset to page 1 when filters change
        setPage(1);
    }, [statusFilter, startDate, endDate, searchTerm]);

    const fetchPreparations = async () => {
        setIsLoadingHistory(true);
        setHistoryError(null);
        setHistoryErrorDetails(null);

        try {
            const params = new URLSearchParams();
            if (statusFilter !== "all") {
                params.append("status", statusFilter);
            }
            if (startDate) {
                params.append("start_date", startDate);
            }
            if (endDate) {
                params.append("end_date", endDate);
            }
            // If search term is provided, fetch all data for client-side filtering
            // Otherwise, use server-side pagination
            if (searchTerm.trim().length === 0) {
                params.append("limit", String(pageSize));
                params.append("offset", String((page - 1) * pageSize));
            } else {
                // Fetch all data when searching (client-side filtering)
                params.append("limit", "10000");
                params.append("offset", "0");
            }

            const result = await apiCall(`/api/production/preparations?${params.toString()}`);
            if (result.status >= 200 && result.status < 300) {
                const data = result.data?.preparations || [];
                const totalCount = result.data?.total || 0;
                setPreparations(data);
                // Apply client-side filtering for search term
                filterPreparationsWithData(data, totalCount);
            } else {
                setHistoryError(result.error || "Failed to fetch production history");
                setHistoryErrorDetails(result.errorDetails);
                setPreparations([]);
                setFilteredPreparations([]);
                setTotal(0);
            }
        } catch (error: any) {
            setHistoryError("Network error occurred");
            setHistoryErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setPreparations([]);
            setFilteredPreparations([]);
            setTotal(0);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const filterPreparationsWithData = (data: ProductionPreparation[], serverTotal: number) => {
        let filtered = [...data];

        // Filter by search term (item name or code) - client-side only
        if (searchTerm.trim().length > 0) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (prep) =>
                    prep.item.name.toLowerCase().includes(searchLower) ||
                    prep.item.code.toLowerCase().includes(searchLower)
            );
        }

        // Apply pagination if search term is used (client-side pagination)
        // Otherwise, server already paginated the data
        let paginatedData = filtered;
        let displayTotal = serverTotal;

        if (searchTerm.trim().length > 0) {
            // Client-side pagination when searching
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            paginatedData = filtered.slice(startIndex, endIndex);
            displayTotal = filtered.length;
        }

        setFilteredPreparations(paginatedData);
        setTotal(displayTotal);
    };

    const filterPreparations = () => {
        // This is called when filters change, but we need to refetch from server
        // Only apply client-side search filter if we have data
        if (preparations.length > 0) {
            filterPreparationsWithData(preparations, total);
        }
    };

    const handleIssueSuccess = () => {
        // Refresh history when production is issued
        fetchPreparations();
    };

    const handleDisposeClick = (prep: ProductionPreparation) => {
        setSelectedItemForDisposal({
            id: prep.item.id,
            name: prep.item.name,
            code: prep.item.code,
        });
        setShowDisposeModal(true);
    };

    const handleDisposeSuccess = () => {
        fetchPreparations();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "issued":
                return <Badge bg="success">Issued</Badge>;
            case "approved":
                return <Badge bg="info">Approved</Badge>;
            case "pending":
                return <Badge bg="warning">Pending</Badge>;
            case "rejected":
                return <Badge bg="danger">Rejected</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-0">Production History</h2>
                        <p className="text-muted small mb-0">View and manage production records</p>
                    </div>
                    <Button variant="primary" onClick={() => setShowIssueModal(true)}>
                        <i className="bi bi-plus-circle me-2"></i>
                        Issue Production
                    </Button>
                </div>

                <ErrorDisplay
                    error={historyError}
                    errorDetails={historyErrorDetails}
                    onDismiss={() => {
                        setHistoryError(null);
                        setHistoryErrorDetails(null);
                    }}
                />

                {/* Production History */}
                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold d-flex justify-content-between align-items-center">
                        <span>Filters</span>
                        <Button variant="outline-primary" size="sm" onClick={fetchPreparations} disabled={isLoadingHistory}>
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Refresh
                        </Button>
                    </Card.Header>
                    <Card.Body>
                        <Row className="g-3">
                            <Col md={3}>
                                <Form.Group controlId="statusFilter">
                                    <Form.Label>
                                        Status
                                        <i
                                            className="bi bi-info-circle ms-1 text-muted"
                                            style={{ cursor: "help" }}
                                            title="Status Workflow: PENDING → (Supervisor approves) → ISSUED | PENDING → (Supervisor rejects) → REJECTED. Note: 'Approved' status exists but is not used in the current workflow."
                                        ></i>
                                    </Form.Label>
                                    <Form.Select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="issued">Issued</option>
                                        <option value="approved">Approved (Unused)</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group controlId="startDate">
                                    <Form.Label>Start Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group controlId="endDate">
                                    <Form.Label>End Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group controlId="searchTerm">
                                    <Form.Label>Search Item</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search by item name or code..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Card className="shadow-sm">
                    <Card.Header className="bg-light fw-bold">
                        <span>Production History ({total})</span>
                    </Card.Header>
                    <Card.Body>
                        {isLoadingHistory ? (
                            <div className="text-center py-4">
                                <Spinner animation="border" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </Spinner>
                            </div>
                        ) : filteredPreparations.length === 0 ? (
                            <Alert variant="info">No production records found.</Alert>
                        ) : (
                            <>
                                <Table striped bordered hover responsive>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Item</th>
                                            <th>Quantity</th>
                                            <th>Status</th>
                                            <th>Prepared By</th>
                                            <th>Prepared At</th>
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
                                                <td>{getStatusBadge(prep.status)}</td>
                                                <td>
                                                    {prep.preparedByUser
                                                        ? `${prep.preparedByUser.firstName} ${prep.preparedByUser.lastName}`
                                                        : "N/A"}
                                                </td>
                                                <td>{format(new Date(prep.prepared_at), "MMM dd, yyyy HH:mm")}</td>
                                                <td>
                                                    {prep.issuedByUser
                                                        ? `${prep.issuedByUser.firstName} ${prep.issuedByUser.lastName}`
                                                        : "-"}
                                                </td>
                                                <td>
                                                    {prep.issued_at
                                                        ? format(new Date(prep.issued_at), "MMM dd, yyyy HH:mm")
                                                        : "-"}
                                                </td>
                                                <td>
                                                    {prep.notes || "-"}
                                                    {prep.rejection_reason && (
                                                        <div className="text-danger small mt-1">
                                                            Rejection: {prep.rejection_reason}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleDisposeClick(prep)}
                                                        title="Dispose/Expire this item"
                                                    >
                                                        <i className="bi bi-trash me-1"></i>
                                                        Dispose
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>

                                {/* Pagination */}
                                {total > 0 && (
                                    <div className="d-flex justify-content-between align-items-center mt-3">
                                        <div className="text-muted">
                                            Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} records
                                        </div>
                                        {Math.ceil(total / pageSize) > 1 && (
                                            <Pagination className="mb-0">
                                                <Pagination.First
                                                    onClick={() => setPage(1)}
                                                    disabled={page === 1}
                                                />
                                                <Pagination.Prev
                                                    onClick={() => setPage(Math.max(1, page - 1))}
                                                    disabled={page === 1}
                                                />
                                                {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1)
                                                    .filter((p) => {
                                                        const totalPages = Math.ceil(total / pageSize);
                                                        if (totalPages <= 7) return true;
                                                        return (
                                                            p === 1 ||
                                                            p === totalPages ||
                                                            (p >= page - 1 && p <= page + 1)
                                                        );
                                                    })
                                                    .map((p, idx, arr) => (
                                                        <React.Fragment key={p}>
                                                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                                <Pagination.Ellipsis />
                                                            )}
                                                            <Pagination.Item
                                                                active={p === page}
                                                                onClick={() => setPage(p)}
                                                            >
                                                                {p}
                                                            </Pagination.Item>
                                                        </React.Fragment>
                                                    ))}
                                                <Pagination.Next
                                                    onClick={() => setPage(Math.min(Math.ceil(total / pageSize), page + 1))}
                                                    disabled={page >= Math.ceil(total / pageSize)}
                                                />
                                                <Pagination.Last
                                                    onClick={() => setPage(Math.ceil(total / pageSize))}
                                                    disabled={page >= Math.ceil(total / pageSize)}
                                                />
                                            </Pagination>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>

                {/* Issue Production Modal */}
                <IssueProductionModal
                    show={showIssueModal}
                    onHide={() => setShowIssueModal(false)}
                    onSuccess={handleIssueSuccess}
                />

                {/* Dispose Item Modal */}
                <DisposeItemModal
                    show={showDisposeModal}
                    onHide={() => {
                        setShowDisposeModal(false);
                        setSelectedItemForDisposal(null);
                    }}
                    onSuccess={handleDisposeSuccess}
                    item={selectedItemForDisposal}
                />
            </div>
        </RoleAwareLayout>
    );
}
