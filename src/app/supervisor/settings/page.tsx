"use client";

import RoleAwareLayout from "../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button, Tab, Tabs } from "react-bootstrap";
import ErrorDisplay from "../../components/ErrorDisplay";
import { useApiCall } from "../../utils/apiUtils";
import { ApiErrorResponse } from "../../utils/errorUtils";

export default function SupervisorSettingsPage() {
  const [activeTab, setActiveTab] = useState("system");
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Supervisor Settings</h1>
            <p className="text-muted">Manage system settings and user assignments as supervisor fallback</p>
          </div>
        </div>

        {/* Error Display */}
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k || "system")}
                  className="mb-3"
                >


                  {/* System Tab */}
                  <Tab eventKey="system" title="System Management">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-header">
                            <h5 className="card-title mb-0">Menu Management</h5>
                          </div>
                          <div className="card-body">
                            <div className="d-grid gap-2">
                              <Button
                                variant="outline-primary"
                                onClick={() => window.location.href = "/supervisor/menu/category"}
                              >
                                <i className="bi bi-grid me-1"></i>
                                Manage Categories
                              </Button>
                              <Button
                                variant="outline-primary"
                                onClick={() => window.location.href = "/supervisor/menu/pricelist"}
                              >
                                <i className="bi bi-tags me-1"></i>
                                Manage Pricelists
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-header">
                            <h5 className="card-title mb-0">Production Management</h5>
                          </div>
                          <div className="card-body">
                            <div className="d-grid gap-2">
                              <Button
                                variant="outline-success"
                                onClick={() => window.location.href = "/supervisor/production/items"}
                              >
                                <i className="bi bi-box me-1"></i>
                                Manage Items
                              </Button>
                              <Button
                                variant="outline-success"
                                onClick={() => window.location.href = "/supervisor/menu/recipes"}
                              >
                                <i className="bi bi-calculator me-1"></i>
                                Manage Definitions
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Tab>

                  {/* Operations Tab */}
                  <Tab eventKey="operations" title="Operations">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-header">
                            <h5 className="card-title mb-0">Sales Operations</h5>
                          </div>
                          <div className="card-body">
                            <p className="text-muted">Take over sales operations when sales person is unavailable</p>
                            <div className="d-grid gap-2">
                              <Button
                                variant="outline-primary"
                                onClick={() => window.location.href = "/home/my-sales"}
                              >
                                <i className="bi bi-receipt me-1"></i>
                                Sales Bills
                              </Button>
                              <Button
                                variant="outline-primary"
                                onClick={() => window.location.href = "/home/post-sales"}
                              >
                                <i className="bi bi-plus-circle me-1"></i>
                                Create Bill
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-header">
                            <h5 className="card-title mb-0">Cashier Operations</h5>
                          </div>
                          <div className="card-body">
                            <p className="text-muted">Take over cashier operations when cashier is unavailable</p>
                            <div className="d-grid gap-2">
                              <Button
                                variant="outline-success"
                                onClick={() => window.location.href = "/home/cashier/bills"}
                              >
                                <i className="bi bi-cash-stack me-1"></i>
                                Cashier Bills
                              </Button>
                              <Button
                                variant="outline-success"
                                onClick={() => window.location.href = "/supervisor/bills/change-requests"}
                              >
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                Change Requests
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="row mt-4">
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-header">
                            <h5 className="card-title mb-0">Bill Settings</h5>
                          </div>
                          <div className="card-body">
                            <p className="text-muted">Manage bill-related settings and configurations</p>
                            <div className="d-grid gap-2">
                              <Button
                                variant="outline-warning"
                                onClick={() => window.location.href = "/supervisor/bills/settings"}
                              >
                                <i className="bi bi-gear me-1"></i>
                                Manage Reopen Reasons
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Tab>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleAwareLayout>
  );
}
