"use client";

import React, { useState, useEffect } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";

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
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const apiCall = useApiCall();

    useEffect(() => {
        fetchBills();
    }, [statusFilter]);

    const fetchBills = async () => {
        try {
            setLoading(true);
            setError(null);
            setErrorDetails(null);

            const url = statusFilter === "all"
                ? "/api/bills?page=1&pageSize=50"
                : `/api/bills?status=${statusFilter}&page=1&pageSize=50`;

            const result = await apiCall(url);

            if (result.status === 200) {
                setBills(result.data.bills || []);
            } else {
                setError(result.error || "Failed to fetch bills");
                setErrorDetails(result.errorDetails || null);
            }
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ networkError: true, status: 0 });
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
                                    Bills ({filteredBills.length})
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
                                ) : filteredBills.length === 0 ? (
                                    <div className="text-center py-5 text-muted">
                                        <i className="bi bi-receipt fs-1 mb-3"></i>
                                        <p>No bills found</p>
                                    </div>
                                ) : (
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
                                                {filteredBills.map((bill) => (
                                                    <tr key={bill.id}>
                                                        <td>
                                                            <strong>#{bill.id}</strong>
                                                        </td>
                                                        <td>
                                                            {bill.user.firstName} {bill.user.lastName}
                                                        </td>
                                                        <td className="d-none d-md-table-cell">{bill.station?.name || "N/A"}</td>
                                                        <td>
                                                            <strong>${(Number(bill.total) || 0).toFixed(2)}</strong>
                                                        </td>
                                                        <td>{getStatusBadge(bill.status)}</td>
                                                        <td className="d-none d-lg-table-cell">
                                                            {new Date(bill.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td>
                                                            <div className="d-flex gap-1 flex-wrap">
                                                                <button 
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    title="View bill details"
                                                                >
                                                                    <i className="bi bi-eye"></i>
                                                                    <span className="d-none d-sm-inline ms-1">View</span>
                                                                </button>
                                                                <button 
                                                                    className="btn btn-sm btn-outline-warning"
                                                                    title="Edit bill"
                                                                >
                                                                    <i className="bi bi-pencil"></i>
                                                                    <span className="d-none d-sm-inline ms-1">Edit</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
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
