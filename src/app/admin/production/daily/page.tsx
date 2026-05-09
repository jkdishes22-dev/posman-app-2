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
    Spinner,
    Alert,
    Row,
    Col,
} from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import { AuthError } from "../../../types/types";
import { format } from "date-fns";

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

export default function AdminDailyProductionPage() {
    const apiCall = useApiCall();

    const [productionIssues, setProductionIssues] = useState<ProductionIssue[]>([]);
    const [filteredIssues, setFilteredIssues] = useState<ProductionIssue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [authError, setAuthError] = useState<AuthError>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "completed" | "cancelled">("all");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [startDate, setStartDate] = useState(() => todayEAT());
    const [endDate, setEndDate] = useState(() => todayEAT());

    const dailyProductionFiltersDirty =
        statusFilter !== "all" ||
        searchTerm.trim() !== "" ||
        startDate !== todayEAT() ||
        endDate !== todayEAT();

    const clearDailyProductionFilters = () => {
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
                return <Badge bg="info">{status}</Badge>;
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
                        <i className="bi bi-calendar-day me-2" aria-hidden></i>
                        Daily Production
                    </h1>
                    <p className="mb-0 mt-2 small text-white-50">View and manage daily production records</p>
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

                <Card className="shadow-sm mb-4 border-0">
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
                                    <Form.Group controlId="statusFilter">
                                        <Form.Label>Status</Form.Label>
                                        <Form.Select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as any)}
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="draft">Draft</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <FilterDatePicker
                                        id="startDate"
                                        label="Start Date"
                                        value={startDate}
                                        onChange={setStartDate}
                                        maxDate={endDate ? ymdToDateEat(endDate) ?? new Date() : new Date()}
                                    />
                                </Col>
                                <Col md={3}>
                                    <FilterDatePicker
                                        id="endDate"
                                        label="End Date"
                                        value={endDate}
                                        onChange={setEndDate}
                                        minDate={startDate ? ymdToDateEat(startDate) ?? undefined : undefined}
                                        maxDate={new Date()}
                                    />
                                </Col>
                                <Col md={2}>
                                    <Form.Group controlId="searchTerm">
                                        <Form.Label>Search</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Search by item name or code"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={1} className="d-flex justify-content-md-end">
                                    <Button
                                        type="button"
                                        variant="outline-secondary"
                                        size="sm"
                                        className="text-nowrap"
                                        disabled={!dailyProductionFiltersDirty}
                                        onClick={clearDailyProductionFilters}
                                    >
                                        <i className="bi bi-x-lg me-1" aria-hidden />
                                        Clear filters
                                    </Button>
                                </Col>
                            </Row>
                        </Form>
                    </Card.Body>
                </Card>

                <Card className="shadow-sm">
                    <Card.Header className="bg-light fw-bold d-flex justify-content-between align-items-center">
                        <span>Production Records ({filteredIssues.length})</span>
                        <Button variant="outline-primary" size="sm" onClick={fetchProductionIssues}>
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Refresh
                        </Button>
                    </Card.Header>
                    <Card.Body>
                        {filteredIssues.length === 0 ? (
                            <Alert variant="info">No production records found.</Alert>
                        ) : (
                            <Table striped bordered hover responsive>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Item</th>
                                        <th>Quantity</th>
                                        <th>Status</th>
                                        <th>Issued By</th>
                                        <th>Issued At</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredIssues.map((issue) => (
                                        <tr key={issue.id}>
                                            <td>{issue.id}</td>
                                            <td>
                                                <div className="fw-semibold">{issue.item.name}</div>
                                                <div className="text-muted small">{issue.item.code}</div>
                                            </td>
                                            <td>{issue.quantity_produced}</td>
                                            <td>{getStatusBadge(issue.status)}</td>
                                            <td>
                                                {issue.issued_by_user
                                                    ? `${issue.issued_by_user.firstName} ${issue.issued_by_user.lastName}`
                                                    : "N/A"}
                                            </td>
                                            <td>
                                                {issue.issued_at
                                                    ? format(new Date(issue.issued_at), "MMM dd, yyyy HH:mm")
                                                    : format(new Date(issue.created_at), "MMM dd, yyyy HH:mm")}
                                            </td>
                                            <td>{issue.notes || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </RoleAwareLayout>
    );
}

