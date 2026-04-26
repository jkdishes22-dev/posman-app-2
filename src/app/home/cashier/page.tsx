"use client";

import React, { useState, useEffect } from "react";
import { Card, Row, Col, Button, Badge, Alert } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import { ApiErrorResponse } from "../../utils/errorUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { useRouter } from "next/navigation";
import { useTooltips } from "../../hooks/useTooltips";

interface DashboardSummary {
  totalBills: number;
  pendingBills: number;
  closedBills: number;
  totalRevenue: number;
  todayRevenue: number;
  averageBillValue: number;
}

const CashierDashboard = () => {
  const apiCall = useApiCall();
  const router = useRouter();
  useTooltips();

  const [summary, setSummary] = useState<DashboardSummary>({
    totalBills: 0,
    pendingBills: 0,
    closedBills: 0,
    totalRevenue: 0,
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
          <Card
            className="h-100 border-0 shadow-sm"
            style={{ cursor: "pointer" }}
            onClick={() => router.push("/home/cashier/bills")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
            }}
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title="View all bills for today"
          >
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
          <Card
            className="h-100 border-0 shadow-sm"
            style={{ cursor: "pointer" }}
            onClick={() => router.push("/home/cashier/bills?status=submitted,reopened")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
            }}
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title="View bills pending payment or processing"
          >
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
          <Card
            className="h-100 border-0 shadow-sm"
            style={{ cursor: "pointer" }}
            onClick={() => router.push("/home/cashier/bills?status=closed")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
            }}
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title="View all closed bills"
          >
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
          <Card
            className="h-100 border-0 shadow-sm"
            style={{ cursor: "pointer" }}
            onClick={() => router.push("/home/cashier/bills?status=closed")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
            }}
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title="View closed bills and revenue details"
          >
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
          <Card
            className="h-100 border-0 shadow-sm"
            style={{ cursor: "pointer" }}
            onClick={() => router.push("/home/cashier/bills?status=closed")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
            }}
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title="View closed bills to see average bill value"
          >
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
          <Card
            className="h-100 border-0 shadow-sm"
            style={{ cursor: "pointer" }}
            onClick={() => router.push("/home/cashier/bills")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
            }}
            data-bs-toggle="tooltip"
            data-bs-placement="top"
            title="View all bills to see completion rate"
          >
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
                    Process Bills
                    <Badge bg="light" text="dark" className="ms-2">
                      {summary.pendingBills}
                    </Badge>
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alerts for Important Information */}
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