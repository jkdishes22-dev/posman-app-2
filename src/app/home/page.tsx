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

const UserHomePage = () => {
  const router = useRouter();
  useTooltips();
  const { user } = useAuth();
  const apiCall = useApiCall();
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayBills: 0,
    pendingBills: 0,
    totalRevenue: 0,
    recentBills: [],
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
      // Fetch today's date for filtering
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // Fetch bills created by the current user for today
      const billsResult = await apiCall(
        `/api/bills?date=${todayStr}&billingUserId=${user.id}&page=1&pageSize=1000`
      );

      if (billsResult.status === 200) {
        const bills = billsResult.data?.bills || [];

        // Filter bills to only include those created by the current user
        const userBills = bills.filter(bill => bill.user?.id === user.id);

        // Calculate metrics from user's bills only
        const todaySales = userBills.length;
        const todayBills = userBills.length;
        const pendingBills = userBills.filter(
          bill => bill.status === "pending" || bill.status === "submitted" || bill.status === "reopened"
        ).length;
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
              status: bill.status === "closed" ? "completed" : bill.status === "pending" || bill.status === "submitted" || bill.status === "reopened" ? "pending" : "completed",
              time: timeAgo
            };
          });

        // Calculate top items from user's bills
        const itemCounts: { [key: string]: { quantity: number; revenue: number } } = {};
        userBills.forEach(bill => {
          if (bill.bill_items) {
            bill.bill_items.forEach((item: any) => {
              const itemName = item.menu_item?.name || item.item_name || "Unknown Item";
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
          totalRevenue,
          recentBills,
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

        {/* Dashboard Header */}
        <div className="row mb-1">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2 className="mb-1">Sales Dashboard</h2>
                <p className="text-muted mb-0">Welcome back! Here's your sales overview for today.</p>
              </div>
              <div className="text-end">
                <small className="text-muted">Last updated: {new Date().toLocaleTimeString()}</small>
              </div>
            </div>
          </div>
        </div>

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
              onClick={() => router.push("/home/my-sales?status=pending")}
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
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title text-white-50">Pending Bills</h6>
                    <h3 className="mb-0">{dashboardData.pendingBills}</h3>
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

        {/* Recent Activity and Top Items */}
        <div className="row">
          <div className="col-md-6 mb-1">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-clock-history me-2"></i>
                  Recent Bills
                </h5>
              </div>
              <div className="card-body">
                {dashboardData.recentBills.map((bill, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <div className="fw-semibold">Bill #{bill.id}</div>
                      <small className="text-muted">{bill.time}</small>
                    </div>
                    <div className="text-end">
                      <div className="fw-semibold">KES {bill.amount}</div>
                      <span className={`badge ${bill.status === "completed" ? "bg-success" : "bg-warning"}`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-md-6 mb-1">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-trophy me-2"></i>
                  Top Selling Items
                </h5>
              </div>
              <div className="card-body">
                {dashboardData.topItems.map((item, index) => (
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
                    <a href="/home" className="btn btn-primary w-100">
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
