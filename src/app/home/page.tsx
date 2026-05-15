"use client";

import { withSecureRoute } from "../components/withSecureRoute";
import RoleAwareLayout from "../shared/RoleAwareLayout";
import { useState, useEffect } from "react";
import { Card, Row, Col } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { useTooltips } from "../hooks/useTooltips";
import { useAuth } from "../contexts/AuthContext";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import ErrorDisplay from "../components/ErrorDisplay";
import PageHeaderStrip from "../components/PageHeaderStrip";
import { todayEAT } from "../shared/eatDate";

const UserHomePage = () => {
  const router = useRouter();
  useTooltips();
  const { user } = useAuth();
  const apiCall = useApiCall();
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayBills: 0,
    pendingBills: 0,
    pendingCount: 0,
    submittedCount: 0,
    reopenedCount: 0,
    totalRevenue: 0,
    recentBills: [],
    openBills: [],
    topItems: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      // Fetch bills created by the current user for today (EAT local date)
      const billsResult = await apiCall(
        `/api/bills?date=${todayEAT()}&billingUserId=${user.id}&page=1&pageSize=1000`
      );

      if (billsResult.status === 200) {
        const bills = billsResult.data?.bills || [];

        // API already filters by billingUserId; use results directly
        const userBills = bills;

        // Calculate metrics from user's bills only
        const todaySales = userBills.length;
        const todayBills = userBills.length;
        const pendingCount = userBills.filter(bill => bill.status === "pending").length;
        const submittedCount = userBills.filter(bill => bill.status === "submitted").length;
        const reopenedCount = userBills.filter(bill => bill.status === "reopened").length;
        const pendingBills = pendingCount + submittedCount + reopenedCount;
        const totalRevenue = userBills
          .filter(bill => bill.status === "closed")
          .reduce((sum, bill) => sum + (Number(bill.total) || 0), 0);

        // Get recent bills (last 3, sorted by creation date descending)
        const recentBills = userBills
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 3)
          .map(bill => {
            const createdDate = new Date(bill.created_at || 0);
            const now = new Date();
            const diffMinutes = Math.floor((now.getTime() - createdDate.getTime()) / 60000);
            let timeAgo = "";
            if (diffMinutes < 1) timeAgo = "Just now";
            else if (diffMinutes < 60) timeAgo = `${diffMinutes} min ago`;
            else if (diffMinutes < 1440) timeAgo = `${Math.floor(diffMinutes / 60)} hour${Math.floor(diffMinutes / 60) > 1 ? "s" : ""} ago`;
            else timeAgo = `${Math.floor(diffMinutes / 1440)} day${Math.floor(diffMinutes / 1440) > 1 ? "s" : ""} ago`;

            return {
              id: bill.id,
              amount: Number(bill.total) || 0,
              status: bill.status === "closed" ? "completed" : (bill.status === "pending" || bill.status === "submitted" || bill.status === "reopened") ? "pending" : "cancelled",
              time: timeAgo
            };
          });

        // All open bills (backlog) — sorted newest first
        const openBills = userBills
          .filter(bill => bill.status === "pending" || bill.status === "submitted" || bill.status === "reopened")
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .map(bill => {
            const createdDate = new Date(bill.created_at || 0);
            const now = new Date();
            const diffMinutes = Math.floor((now.getTime() - createdDate.getTime()) / 60000);
            let timeAgo = "";
            if (diffMinutes < 1) timeAgo = "Just now";
            else if (diffMinutes < 60) timeAgo = `${diffMinutes}m ago`;
            else if (diffMinutes < 1440) timeAgo = `${Math.floor(diffMinutes / 60)}h ago`;
            else timeAgo = `${Math.floor(diffMinutes / 1440)}d ago`;
            return { id: bill.id, amount: Number(bill.total) || 0, status: bill.status as string, time: timeAgo };
          });

        // Calculate top items from user's bills
        const itemCounts: { [key: string]: { quantity: number; revenue: number } } = {};
        userBills.forEach(bill => {
          if (bill.bill_items) {
            bill.bill_items.forEach((item: any) => {
              const itemName = item.item?.name || "Unknown Item";
              if (!itemCounts[itemName]) {
                itemCounts[itemName] = { quantity: 0, revenue: 0 };
              }
              itemCounts[itemName].quantity += Number(item.quantity) || 0;
              itemCounts[itemName].revenue += (Number(item.quantity) || 0) * (Number(item.price) || 0);
            });
          }
        });

        const topItems = Object.entries(itemCounts)
          .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 3);

        setDashboardData({
          todaySales,
          todayBills,
          pendingBills,
          pendingCount,
          submittedCount,
          reopenedCount,
          totalRevenue,
          recentBills,
          openBills,
          topItems
        });
      } else {
        setError(billsResult.error || "Failed to load dashboard data");
        setErrorDetails(billsResult.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <RoleAwareLayout>
        <div className="container-fluid p-0">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </RoleAwareLayout>
    );
  }

  return (
    <RoleAwareLayout>
      <div className="container-fluid p-0 sales-home-screen">
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        <PageHeaderStrip
          actions={
            <small className="text-white-50">Last updated: {new Date().toLocaleTimeString()}</small>
          }
        >
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-speedometer2 me-2" aria-hidden></i>
            Sales Dashboard
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Welcome back! Here&apos;s your sales overview for today.</p>
        </PageHeaderStrip>

        {/* Summary Cards */}
        <Row className="mb-1">
          <Col md={3} className="mb-1">
            <Card
              className="bg-primary text-white h-100 border-0"
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/home/my-sales")}
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
              title="View your sales and performance"
            >
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title text-white-50">Today's Sales</h6>
                    <h3 className="mb-0">{dashboardData.todaySales}</h3>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-cart-check fs-1"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3} className="mb-1">
            <Card
              className="bg-success text-white h-100 border-0"
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/home/my-sales")}
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
              title="View all bills created today"
            >
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title text-white-50">Today's Bills</h6>
                    <h3 className="mb-0">{dashboardData.todayBills}</h3>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-receipt fs-1"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3} className="mb-1">
            <Card
              className="bg-warning text-white h-100 border-0"
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/home/my-sales?status=open")}
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
              title="View all open bills (pending, submitted, reopened)"
            >
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title text-white-50">Open Bills</h6>
                    <h3 className="mb-0">{dashboardData.pendingBills}</h3>
                    <small className="text-white-50" style={{ fontSize: "0.7rem" }}>
                      {dashboardData.pendingCount}p · {dashboardData.submittedCount}s · {dashboardData.reopenedCount}r
                    </small>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-clock fs-1"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3} className="mb-1">
            <Card
              className="bg-info text-white h-100 border-0"
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/home/my-sales")}
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
              title="View revenue details and sales reports"
            >
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title text-white-50">Total Revenue</h6>
                    <h3 className="mb-0">KES {dashboardData.totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-currency-dollar fs-1"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recent Activity, Open Bills Backlog, and Top Items */}
        <div className="row">
          <div className="col-md-4 mb-1">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-clock-history me-2"></i>
                  Recent Bills
                </h5>
              </div>
              <div className="card-body">
                {dashboardData.recentBills.length === 0 ? (
                  <p className="text-muted small mb-0">No bills today.</p>
                ) : dashboardData.recentBills.map((bill, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <div className="fw-semibold">Bill #{bill.id}</div>
                      <small className="text-muted">{bill.time}</small>
                    </div>
                    <div className="text-end">
                      <div className="fw-semibold">KES {bill.amount}</div>
                      <span className={`badge ${bill.status === "completed" ? "bg-success" : bill.status === "pending" ? "bg-warning text-dark" : "bg-secondary"}`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-1">
            <div className="card h-100">
              <div className="card-header d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="mb-0">
                    <i className="bi bi-hourglass-split me-2"></i>
                    Open Bills
                  </h5>
                  {dashboardData.openBills.length > 0 && (
                    <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                      <span className="text-warning fw-semibold">{dashboardData.pendingCount} pending</span>
                      {" · "}
                      <span className="text-info fw-semibold">{dashboardData.submittedCount} submitted</span>
                      {" · "}
                      <span className="text-danger fw-semibold">{dashboardData.reopenedCount} reopened</span>
                    </small>
                  )}
                </div>
                {dashboardData.openBills.length > 0 && (
                  <span className="badge bg-warning text-dark">{dashboardData.openBills.length}</span>
                )}
              </div>
              <div className="card-body p-0">
                {dashboardData.openBills.length === 0 ? (
                  <p className="text-muted small mb-0 p-3">No open bills — all clear!</p>
                ) : (
                  <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                    {dashboardData.openBills.map((bill, index) => (
                      <div key={index} className="d-flex justify-content-between align-items-center py-2 px-3 border-bottom">
                        <div>
                          <div className="fw-semibold">Bill #{bill.id}</div>
                          <small className="text-muted">{bill.time}</small>
                        </div>
                        <div className="text-end">
                          <div className="fw-semibold">KES {bill.amount}</div>
                          <span className={`badge ${bill.status === "submitted" ? "bg-info text-dark" : bill.status === "reopened" ? "bg-danger" : "bg-warning text-dark"}`}>
                            {bill.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-1">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-trophy me-2"></i>
                  Top Selling Items
                </h5>
              </div>
              <div className="card-body">
                {dashboardData.topItems.length === 0 ? (
                  <p className="text-muted small mb-0">No sales data today.</p>
                ) : dashboardData.topItems.map((item, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <div className="fw-semibold">{item.name}</div>
                      <small className="text-muted">Qty: {item.quantity}</small>
                    </div>
                    <div className="text-end">
                      <div className="fw-semibold">KES {item.revenue}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-lightning me-2"></i>
                  Quick Actions
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3 mb-1">
                    <a href="/home/billing" className="btn btn-primary w-100">
                      <i className="bi bi-plus-circle me-2"></i>
                      New Bill
                    </a>
                  </div>
                  <div className="col-md-3 mb-1">
                    <a href="/home/my-sales" className="btn btn-outline-primary w-100">
                      <i className="bi bi-receipt me-2"></i>
                      My Sales
                    </a>
                  </div>
                  <div className="col-md-3 mb-1">
                    <a href="/home/pricelist-catalog" className="btn btn-outline-info w-100">
                      <i className="bi bi-book me-2"></i>
                      Pricelist
                    </a>
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

export default withSecureRoute(UserHomePage, { roleRequired: "sales" });
