"use client";

import { withSecureRoute } from "../components/withSecureRoute";
import RoleAwareLayout from "../shared/RoleAwareLayout";
import { useState, useEffect } from "react";

const UserHomePage = () => {
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayBills: 0,
    pendingBills: 0,
    totalRevenue: 0,
    recentBills: [],
    topItems: []
  });

  useEffect(() => {
    // Simulate loading dashboard data
    setDashboardData({
      todaySales: 15,
      todayBills: 23,
      pendingBills: 7,
      totalRevenue: 12500,
      recentBills: [
        { id: 1001, amount: 450, status: "completed", time: "2 min ago" },
        { id: 1002, amount: 320, status: "pending", time: "5 min ago" },
        { id: 1003, amount: 180, status: "completed", time: "8 min ago" }
      ],
      topItems: [
        { name: "Chicken Burger", quantity: 12, revenue: 2400 },
        { name: "French Fries", quantity: 8, revenue: 800 },
        { name: "Coca Cola", quantity: 15, revenue: 750 }
      ]
    });
  }, []);

  return (
    <RoleAwareLayout>
      <div className="container-fluid p-0">
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
        <div className="row mb-1">
          <div className="col-md-3 mb-1">
            <div className="card bg-primary text-white h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title text-white-50">Today's Sales</h6>
                    <h3 className="mb-0">{dashboardData.todaySales}</h3>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-cart-check fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-1">
            <div className="card bg-success text-white h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title text-white-50">Today's Bills</h6>
                    <h3 className="mb-0">{dashboardData.todayBills}</h3>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-receipt fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-1">
            <div className="card bg-warning text-white h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title text-white-50">Pending Bills</h6>
                    <h3 className="mb-0">{dashboardData.pendingBills}</h3>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-clock fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-1">
            <div className="card bg-info text-white h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="card-title text-white-50">Total Revenue</h6>
                    <h3 className="mb-0">KES {dashboardData.totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="align-self-center">
                    <i className="bi bi-currency-dollar fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
