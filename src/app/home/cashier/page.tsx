"use client";

import React, { useState, useEffect } from "react";
import { Card, Row, Col, Button, Badge, Alert } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import { ApiErrorResponse } from "../../utils/errorUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { useRouter } from "next/navigation";

interface DashboardSummary {
  totalBills: number;
  pendingBills: number;
  closedBills: number;
  totalRevenue: number;
  pendingVoidRequests: number;
  todayRevenue: number;
  averageBillValue: number;
}

const CashierDashboard = () => {
  const apiCall = useApiCall();
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary>({
    totalBills: 0,
    pendingBills: 0,
    closedBills: 0,
    totalRevenue: 0,
    pendingVoidRequests: 0,
    todayRevenue: 0,
    averageBillValue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const fetchDashboardSummary = async () => {
    setLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      // Fetch today's date for filtering
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // Fetch bills for today
      const billsResult = await apiCall(`/api/bills?date=${todayStr}`);

      if (billsResult.status === 200) {
        const bills = billsResult.data?.bills || [];

        // Calculate summaries
        const totalBills = bills.length;
        const pendingBills = bills.filter(bill => bill.status === "submitted" || bill.status === "reopened").length;
        const closedBills = bills.filter(bill => bill.status === "closed").length;
        const pendingVoidRequests = bills.filter(bill =>
          bill.bill_items?.some(item => item.status === "void_pending")
        ).length;

        const totalRevenue = bills
          .filter(bill => bill.status === "closed")
          .reduce((sum, bill) => sum + (bill.total || 0), 0);

        const todayRevenue = bills
          .filter(bill => bill.status === "closed")
          .reduce((sum, bill) => sum + (bill.total || 0), 0);

        const averageBillValue = closedBills > 0 ? todayRevenue / closedBills : 0;

        setSummary({
          totalBills,
          pendingBills,
          closedBills,
          totalRevenue,
          pendingVoidRequests,
          todayRevenue,
          averageBillValue,
        });
      } else {
        setError(billsResult.error || "Failed to fetch dashboard data");
        setErrorDetails(billsResult.errorDetails);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "bills":
        router.push("/home/cashier/bills");
        break;
      case "void-requests":
        router.push("/home/cashier/void-requests");
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Cashier Dashboard</h2>
        <div className="text-muted">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          })}
        </div>
      </div>

      <ErrorDisplay
        error={error}
        errorDetails={errorDetails}
        onDismiss={() => {
          setError(null);
          setErrorDetails(null);
        }}
      />

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <i className="bi bi-receipt text-primary fs-1"></i>
              </div>
              <h3 className="text-primary mb-1">{summary.totalBills}</h3>
              <p className="text-muted mb-0">Total Bills Today</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <i className="bi bi-clock text-warning fs-1"></i>
              </div>
              <h3 className="text-warning mb-1">{summary.pendingBills}</h3>
              <p className="text-muted mb-0">Pending Bills</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <i className="bi bi-check-circle text-success fs-1"></i>
              </div>
              <h3 className="text-success mb-1">{summary.closedBills}</h3>
              <p className="text-muted mb-0">Closed Bills</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <i className="bi bi-currency-exchange text-info fs-1"></i>
              </div>
              <h3 className="text-info mb-1">KES {summary.todayRevenue.toLocaleString()}</h3>
              <p className="text-muted mb-0">Today's Revenue</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Additional Metrics */}
      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <i className="bi bi-exclamation-triangle text-danger fs-1"></i>
              </div>
              <h3 className="text-danger mb-1">{summary.pendingVoidRequests}</h3>
              <p className="text-muted mb-0">Pending Void Requests</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <i className="bi bi-graph-up text-success fs-1"></i>
              </div>
              <h3 className="text-success mb-1">KES {summary.averageBillValue.toLocaleString()}</h3>
              <p className="text-muted mb-0">Average Bill Value</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-3">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <i className="bi bi-percent text-primary fs-1"></i>
              </div>
              <h3 className="text-primary mb-1">
                {summary.totalBills > 0 ? Math.round((summary.closedBills / summary.totalBills) * 100) : 0}%
              </h3>
              <p className="text-muted mb-0">Completion Rate</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row>
        <Col md={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light">
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => handleQuickAction("bills")}
                  >
                    <i className="bi bi-receipt"></i>
                    Manage Bills
                    <Badge bg="light" text="dark" className="ms-2">
                      {summary.pendingBills}
                    </Badge>
                  </Button>
                </Col>

                <Col md={6} className="mb-3">
                  <Button
                    variant="warning"
                    size="lg"
                    className="w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => handleQuickAction("void-requests")}
                  >
                    <i className="bi bi-exclamation-triangle"></i>
                    Void Requests
                    <Badge bg="light" text="dark" className="ms-2">
                      {summary.pendingVoidRequests}
                    </Badge>
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alerts for Important Information */}
      {summary.pendingVoidRequests > 0 && (
        <Alert variant="warning" className="mt-4">
          <Alert.Heading>
            <i className="bi bi-exclamation-triangle me-2"></i>
            Action Required
          </Alert.Heading>
          <p className="mb-0">
            You have <strong>{summary.pendingVoidRequests}</strong> pending void request{summary.pendingVoidRequests > 1 ? "s" : ""} that need your attention.
            <Button
              variant="outline-warning"
              size="sm"
              className="ms-2"
              onClick={() => handleQuickAction("void-requests")}
            >
              Review Now
            </Button>
          </p>
        </Alert>
      )}

      {summary.pendingBills > 0 && (
        <Alert variant="info" className="mt-3">
          <Alert.Heading>
            <i className="bi bi-info-circle me-2"></i>
            Bills Pending
          </Alert.Heading>
          <p className="mb-0">
            You have <strong>{summary.pendingBills}</strong> bill{summary.pendingBills > 1 ? "s" : ""} waiting to be processed.
            <Button
              variant="outline-info"
              size="sm"
              className="ms-2"
              onClick={() => handleQuickAction("bills")}
            >
              Process Bills
            </Button>
          </p>
        </Alert>
      )}
    </div>
  );
};

export default CashierDashboard;