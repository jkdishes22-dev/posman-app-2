"use client";

import React from "react";
import RoleAwareLayout from "../shared/RoleAwareLayout";

const SupervisorDashboard: React.FC = () => {
    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12">
                        <h1 className="h3 mb-4">Supervisor Dashboard</h1>

                        {/* Quick Stats Cards */}
                        <div className="row mb-4">
                            <div className="col-md-3">
                                <div className="card bg-primary text-white">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between">
                                            <div>
                                                <h4 className="card-title">Total Bills</h4>
                                                <h2 className="mb-0">0</h2>
                                            </div>
                                            <div className="align-self-center">
                                                <i className="bi bi-receipt fs-1"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-3">
                                <div className="card bg-success text-white">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between">
                                            <div>
                                                <h4 className="card-title">Completed</h4>
                                                <h2 className="mb-0">0</h2>
                                            </div>
                                            <div className="align-self-center">
                                                <i className="bi bi-check-circle fs-1"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-3">
                                <div className="card bg-warning text-white">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between">
                                            <div>
                                                <h4 className="card-title">Pending</h4>
                                                <h2 className="mb-0">0</h2>
                                            </div>
                                            <div className="align-self-center">
                                                <i className="bi bi-clock fs-1"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-3">
                                <div className="card bg-info text-white">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between">
                                            <div>
                                                <h4 className="card-title">Revenue</h4>
                                                <h2 className="mb-0">$0.00</h2>
                                            </div>
                                            <div className="align-self-center">
                                                <i className="bi bi-currency-dollar fs-1"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="row">
                            <div className="col-md-8">
                                <div className="card">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0">Recent Bills</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="text-center text-muted py-5">
                                            <i className="bi bi-receipt fs-1 mb-3"></i>
                                            <p>No recent bills found</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-4">
                                <div className="card">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0">Quick Actions</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="d-grid gap-2">
                                            <button className="btn btn-primary">
                                                <i className="bi bi-eye me-2"></i>
                                                View All Bills
                                            </button>
                                            <button className="btn btn-success">
                                                <i className="bi bi-graph-up me-2"></i>
                                                Generate Report
                                            </button>
                                            <button className="btn btn-warning">
                                                <i className="bi bi-gear me-2"></i>
                                                Settings
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </RoleAwareLayout>
    );
};

export default SupervisorDashboard;
