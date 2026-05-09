"use client";
import React, { useState, useEffect } from "react";
import { todayEAT } from "../../../shared/eatDate";
import FilterDatePicker from "../../../shared/FilterDatePicker";
import { ymdToDateEat } from "../../../shared/filterDateUtils";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import {
    Card,
    Table,
    Badge,
    Button,
    Form,
    InputGroup,
    Spinner,
    Alert,
    Row,
    Col,
} from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import { AuthError } from "../../../types/types";
import DisposeItemModal from "../../../admin/production/DisposeItemModal";
import { useTooltips } from "../../../hooks/useTooltips";
import PageHeaderStrip from "../../../components/PageHeaderStrip";

interface ProductionIssue {
    id: number;
    item_id: number;
    item: {
        id: number;
        name: string;
        code: string;
    };
    quantity_produced: number;
    status: "draft" | "completed" | "cancelled";
    issued_by: number;
    issued_by_user?: {
        id: number;
        firstName: string;
        lastName: string;
    };
    issued_at: string;
    notes: string | null;
    created_at: string;
}

export default function StorekeeperProductionHistoryPage() {
    const apiCall = useApiCall();
    useTooltips();

    const [productionIssues, setProductionIssues] = useState<ProductionIssue[]>([]);
    const [filteredIssues, setFilteredIssues] = useState<ProductionIssue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [authError, setAuthError] = useState<AuthError>(null);
    const [showDisposeModal, setShowDisposeModal] = useState<boolean>(false);
    const [selectedItemForDisposal, setSelectedItemForDisposal] = useState<{ id: number; name: string; code: string } | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "completed" | "cancelled">("all");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [startDate, setStartDate] = useState(() => todayEAT());
    const [endDate, setEndDate] = useState(() => todayEAT());

    const productionIssueFiltersDirty =
        statusFilter !== "all" ||
        searchTerm.trim() !== "" ||
        startDate !== todayEAT() ||
        endDate !== todayEAT();

    const clearProductionIssueFilters = () => {
        const d = todayEAT();
        setStatusFilter("all");
        setSearchTerm("");
        setStartDate(d);
        setEndDate(d);
    };

    useEffect(() => {
        fetchProductionIssues();
    }, [apiCall]);

    useEffect(() => {
        filterProductionIssues();
    }, [productionIssues, statusFilter, searchTerm, startDate, endDate]);

    const fetchProductionIssues = async () => {
        setIsLoading(true);
        setError(null);
        setErrorDetails(null);

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
            params.append("limit", "100");

            const result = await apiCall(`/api/production/issues?${params.toString()}`);
            if (result.status >= 200 && result.status < 300) {
                const data = result.data?.issues || [];
                setProductionIssues(data);
                setFilteredIssues(data);
            } else {
                if (result.status === 403) {
                    setAuthError({ message: result.error || "Access denied" });
                }
                setError(result.error || "Failed to fetch production issues");
                setErrorDetails(result.errorDetails);
                setProductionIssues([]);
                setFilteredIssues([]);
            }
        } catch (error: any) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setProductionIssues([]);
            setFilteredIssues([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filterProductionIssues = () => {
        let filtered = [...productionIssues];

        // Filter by status
        if (statusFilter !== "all") {
            filtered = filtered.filter((issue) => issue.status === statusFilter);
        }

        // Filter by search term (item name or code)
        if (searchTerm.trim().length > 0) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (issue) =>
                    issue.item.name.toLowerCase().includes(searchLower) ||
                    issue.item.code.toLowerCase().includes(searchLower)
            );
        }

        // Filter by date range
        if (startDate) {
            const start = new Date(startDate);
            filtered = filtered.filter((issue) => {
                const issueDate = new Date(issue.issued_at || issue.created_at);
                return issueDate >= start;
            });
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // End of day
            filtered = filtered.filter((issue) => {
                const issueDate = new Date(issue.issued_at || issue.created_at);
                return issueDate <= end;
            });
        }

        setFilteredIssues(filtered);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return <Badge bg="success">Completed</Badge>;
            case "draft":
                return <Badge bg="secondary">Draft</Badge>;
            case "cancelled":
                return <Badge bg="danger">Cancelled</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch {
            return "Invalid Date";
        }
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <PageHeaderStrip
                    actions={
                        <Button variant="light" href="/storekeeper/production/issue">
                            <i className="bi bi-plus-circle me-2"></i>
                            Issue Production
                        </Button>
                    }
                >
                    <h1 className="h4 mb-0 fw-bold d-flex align-items-center flex-wrap gap-2">
                        <i className="bi bi-clock-history me-1" aria-hidden />
                        Production History
                        <i
                            className="bi bi-question-circle text-muted"
                            style={{ cursor: "help", fontSize: "0.95rem" }}
                            data-bs-toggle="tooltip"
                            data-bs-placement="bottom"
                            title="View and manage production preparation records"
                        ></i>
                    </h1>
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
                        {authError.message}
                    </Alert>
                )}

                <Card className="mb-4 shadow-sm border-0">
                    <Card.Header className="bg-light fw-bold py-2 px-3 d-flex align-items-center">
                        <i className="bi bi-funnel me-2 text-primary" aria-hidden />
                        Filters
                    </Card.Header>
                    <Card.Body>
                        <Form
                            noValidate
                            onSubmit={(e) => {
                                e.preventDefault();
                            }}
                        >
                            <Row className="g-3 align-items-end">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Search Item</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Search by item name or code..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group>
                                        <Form.Label>Status</Form.Label>
                                        <Form.Select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as any)}
                                        >
                                            <option value="all">All Status</option>
                                            <option value="completed">Completed</option>
                                            <option value="draft">Draft</option>
                                            <option value="cancelled">Cancelled</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <FilterDatePicker
                                        label="Start Date"
                                        value={startDate}
                                        onChange={setStartDate}
                                        maxDate={endDate ? ymdToDateEat(endDate) ?? new Date() : new Date()}
                                    />
                                </Col>
                                <Col md={3}>
                                    <FilterDatePicker
                                        label="End Date"
                                        value={endDate}
                                        onChange={setEndDate}
                                        minDate={startDate ? ymdToDateEat(startDate) ?? undefined : undefined}
                                        maxDate={new Date()}
                                    />
                                </Col>
                                <Col md={1} className="d-flex align-items-end justify-content-md-end">
                                    <Button
                                        type="button"
                                        variant="outline-secondary"
                                        size="sm"
                                        className="text-nowrap"
                                        disabled={!productionIssueFiltersDirty}
                                        onClick={clearProductionIssueFilters}
                                    >
                                        <i className="bi bi-x-lg me-1" aria-hidden />
                                        Clear filters
                                    </Button>
                                </Col>
                            </Row>
                        </Form>
                    </Card.Body>
                </Card>

                <Card>
                    <Card.Body>
                        {isLoading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" />
                                <p className="mt-2">Loading production issues...</p>
                            </div>
                        ) : filteredIssues.length === 0 ? (
                            <div className="text-center py-5">
                                <p className="text-muted">No production issues found</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table striped bordered hover>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Item</th>
                                            <th>Quantity</th>
                                            <th>Status</th>
                                            <th>Issued By</th>
                                            <th>Issued At</th>
                                            <th>Notes</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredIssues.map((issue) => (
                                            <tr key={issue.id}>
                                                <td>{issue.id}</td>
                                                <td>
                                                    <div>
                                                        <strong>{issue.item.name}</strong>
                                                        <br />
                                                        <small className="text-muted">{issue.item.code}</small>
                                                    </div>
                                                </td>
                                                <td>{issue.quantity_produced}</td>
                                                <td>{getStatusBadge(issue.status)}</td>
                                                <td>
                                                    {issue.issued_by_user
                                                        ? `${issue.issued_by_user.firstName} ${issue.issued_by_user.lastName}`
                                                        : `User ${issue.issued_by}`}
                                                </td>
                                                <td>{formatDate(issue.issued_at || issue.created_at)}</td>
                                                <td>{issue.notes || <span className="text-muted">-</span>}</td>
                                                <td>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedItemForDisposal({
                                                                id: issue.item.id,
                                                                name: issue.item.name,
                                                                code: issue.item.code,
                                                            });
                                                            setShowDisposeModal(true);
                                                        }}
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
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* Dispose Item Modal */}
                <DisposeItemModal
                    show={showDisposeModal}
                    onHide={() => {
                        setShowDisposeModal(false);
                        setSelectedItemForDisposal(null);
                    }}
                    onSuccess={() => {
                        fetchProductionIssues();
                    }}
                    item={selectedItemForDisposal}
                />
            </div>
        </RoleAwareLayout>
    );
}

