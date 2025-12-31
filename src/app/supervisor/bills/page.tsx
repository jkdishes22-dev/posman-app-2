"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import Pagination from "../../components/Pagination";

interface Bill {
    id: number;
    total: number;
    status: string;
    created_at: string;
    user: {
        firstName: string;
        lastName: string;
    };
    station?: {
        name: string;
    };
}

const SupervisorBillsPage: React.FC = () => {
    const router = useRouter();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;
    const apiCall = useApiCall();

    // For client-side pagination when searching
    const [searchPage, setSearchPage] = useState(1);

    const handleViewBill = (billId: number) => {
        // Navigate to bill details in cashier bills page in the same window
        router.push(`/home/cashier/bills?billId=${billId}`);
    };

    useEffect(() => {
        fetchBills();
    }, [statusFilter, page]);

    // Reset to page 1 when status filter changes
    useEffect(() => {
        setPage(1);
        setSearchPage(1);
    }, [statusFilter]);

    // Reset search page when search term changes
    useEffect(() => {
        setSearchPage(1);
    }, [searchTerm]);

    const fetchBills = async () => {
        try {
            setLoading(true);
            setError(null);
            setErrorDetails(null);

            const url = statusFilter === "all"
                ? `/api/bills?page=${page}&pageSize=${pageSize}`
                : `/api/bills?status=${statusFilter}&page=${page}&pageSize=${pageSize}`;

            const result = await apiCall(url);

            if (result.status === 200) {
                setBills(result.data.bills || []);
                setTotal(result.data.total || 0);
            } else {
                setError(result.error || "Failed to fetch bills");
                setErrorDetails(result.errorDetails || null);
                setBills([]);
                setTotal(0);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ networkError: true, status: 0 });
            setBills([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    const filteredBills = bills.filter(bill => {
        const matchesSearch = searchTerm === "" ||
            bill.id.toString().includes(searchTerm) ||
            bill.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.station?.name.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    // For client-side pagination when searching
    const paginatedBills = searchTerm
        ? filteredBills.slice((searchPage - 1) * pageSize, searchPage * pageSize)
        : filteredBills;

    const displayTotal = searchTerm ? filteredBills.length : total;

    const getStatusBadge = (status: string) => {
        const statusClasses = {
            pending: "bg-warning",
            submitted: "bg-info",
            closed: "bg-success",
            reopened: "bg-danger",
            voided: "bg-secondary"
        };

        return (
            <span className={`badge ${statusClasses[status] || "bg-secondary"}`}>
                {status.toUpperCase()}
            </span>
        );
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid" style={{ overflowX: "hidden" }}>
                <div className="row">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h1 className="h3 mb-0">Bills Management</h1>
                            <button className="btn btn-primary" onClick={fetchBills}>
                                <i className="bi bi-arrow-clockwise me-2"></i>
                                Refresh
                            </button>
                        </div>

                        <ErrorDisplay
                            error={error}
                            errorDetails={errorDetails}
                            onDismiss={() => {
                                setError(null);
                                setErrorDetails(null);
                            }}
                        />

                        {/* Filters */}
                        <div className="card mb-4">
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-12 col-md-6 col-lg-4">
                                        <label className="form-label">Status Filter</label>
                                        <select
                                            className="form-select"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <option value="all">All Bills</option>
                                            <option value="pending">Pending</option>
                                            <option value="submitted">Submitted</option>
                                            <option value="closed">Closed</option>
                                            <option value="reopened">Reopened</option>
                                            <option value="voided">Voided</option>
                                        </select>
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-4">
                                        <label className="form-label">Search</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Search by ID, user, or station..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-12 col-md-12 col-lg-4 d-flex align-items-end">
                                        <button
                                            className="btn btn-outline-secondary w-100"
                                            onClick={() => {
                                                setSearchTerm("");
                                                setStatusFilter("all");
                                                setPage(1);
                                            }}
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bills Table */}
                        <div className="card">
                            <div className="card-header">
                                <h5 className="card-title mb-0">
                                    Bills ({displayTotal})
                                </h5>
                            </div>
                            <div className="card-body">
                                {loading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-3 text-muted">Loading bills...</p>
                                    </div>
                                ) : paginatedBills.length === 0 ? (
                                    <div className="text-center py-5 text-muted">
                                        <i className="bi bi-receipt fs-1 mb-3"></i>
                                        <p>No bills found</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                                            <table className="table table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>Bill ID</th>
                                                        <th>User</th>
                                                        <th className="d-none d-md-table-cell">Station</th>
                                                        <th>Total</th>
                                                        <th>Status</th>
                                                        <th className="d-none d-lg-table-cell">Created</th>
                                                        <th style={{ minWidth: "100px" }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedBills.map((bill) => (
                                                        <tr key={bill.id}>
                                                            <td>
                                                                <strong>#{bill.id}</strong>
                                                            </td>
                                                            <td>
                                                                {bill.user.firstName} {bill.user.lastName}
                                                            </td>
                                                            <td className="d-none d-md-table-cell">{bill.station?.name || "N/A"}</td>
                                                            <td>
                                                                <strong>KES {(Number(bill.total) || 0).toFixed(2)}</strong>
                                                            </td>
                                                            <td>{getStatusBadge(bill.status)}</td>
                                                            <td className="d-none d-lg-table-cell">
                                                                {new Date(bill.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    title="View bill details"
                                                                    onClick={() => handleViewBill(bill.id)}
                                                                >
                                                                    <i className="bi bi-eye"></i>
                                                                    <span className="d-none d-sm-inline ms-1">View</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="mt-4">
                                            {searchTerm ? (
                                                <Pagination
                                                    page={searchPage}
                                                    pageSize={pageSize}
                                                    total={filteredBills.length}
                                                    onPageChange={setSearchPage}
                                                    showInfo={true}
                                                />
                                            ) : (
                                                <Pagination
                                                    page={page}
                                                    pageSize={pageSize}
                                                    total={total}
                                                    onPageChange={setPage}
                                                    showInfo={true}
                                                />
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </RoleAwareLayout>
    );
};

export default SupervisorBillsPage;
