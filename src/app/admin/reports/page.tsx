"use client";

import RoleAwareLayout from "../../shared/RoleAwareLayout";
import React from "react";
import { Card, Row, Col } from "react-bootstrap";
import Link from "next/link";

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

const reportCards: ReportCard[] = [
  {
    id: "bill-payments",
    title: "Bill Payments",
    description: "List all bill payments with payment type, reference, and date filters",
    icon: "bi-receipt-cutoff",
    path: "/admin/reports/bill-payments",
    color: "success"
  },
  {
    id: "pnl",
    title: "Profit & Loss",
    description: "Comprehensive P&L analysis with actual and projected revenue",
    icon: "bi-graph-up-arrow",
    path: "/admin/reports/pnl",
    color: "success"
  },
  {
    id: "sales-revenue",
    title: "Sales Revenue",
    description: "View actual and projected revenue from closed and active bills",
    icon: "bi-currency-dollar",
    path: "/admin/reports/sales-revenue",
    color: "primary"
  },
  {
    id: "items-sold-count",
    title: "Items Sold Count",
    description: "Count of items sold with quantity tracking",
    icon: "bi-cart",
    path: "/admin/reports/items-sold-count",
    color: "info"
  },
  {
    id: "production-stock-revenue",
    title: "Stock & Production",
    description: "Compare revenue from production items vs stock items",
    icon: "bi-box-seam",
    path: "/admin/reports/production-stock-revenue",
    color: "secondary"
  },
  {
    id: "expenditure",
    title: "Expenditure",
    description: "Stock items supplied and expenses per supplier",
    icon: "bi-cash-stack",
    path: "/admin/reports/expenditure",
    color: "warning"
  },
  {
    id: "purchase-orders",
    title: "Purchase Orders",
    description: "View all purchase orders with status and supplier details",
    icon: "bi-cart-check",
    path: "/admin/reports/purchase-orders",
    color: "dark"
  },
];

export default function ReportsDashboardPage() {
  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-2">Reports Dashboard</h1>
            <p className="text-muted">Access all financial and operational reports</p>
          </div>
        </div>

        <Row className="g-4">
          {reportCards.map((report) => (
            <Col key={report.id} xs={12} sm={6} lg={4}>
              <Link 
                href={report.path} 
                style={{ textDecoration: "none", color: "inherit" }}
                className="d-block h-100"
              >
                <Card 
                  className={`h-100 border-${report.color} shadow-sm`}
                  style={{ 
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow = "0 0.5rem 1rem rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 0.125rem 0.25rem rgba(0,0,0,0.075)";
                  }}
                >
                  <Card.Body className="d-flex flex-column">
                    <div className={`text-${report.color} mb-3 report-icon`} style={{ fontSize: "2.5rem" }}>
                      <i className={`bi ${report.icon}`}></i>
                    </div>
                    <Card.Title className="h5 mb-2">{report.title}</Card.Title>
                    <Card.Text className="text-muted small flex-grow-1">
                      {report.description}
                    </Card.Text>
                    <div className="mt-auto pt-2">
                      <span className={`badge bg-${report.color} text-white`}>
                        View Report <i className="bi bi-arrow-right ms-1"></i>
                      </span>
                    </div>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        <Row className="mt-5">
          <Col xs={12}>
            <Card className="bg-light">
              <Card.Body>
                <h5 className="card-title mb-3">
                  <i className="bi bi-info-circle me-2"></i>
                  Report Features
                </h5>
                <Row>
                  <Col md={6}>
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <strong>Date Range Filtering:</strong> Filter reports by day, week, month, or year
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <strong>Item Filtering:</strong> Filter by specific items across all reports
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <strong>User Filtering:</strong> Filter by sales users where applicable
                      </li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <strong>Supplier Filtering:</strong> Filter expenditure and purchase order reports by supplier
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <strong>Real-time Data:</strong> All reports use live data from the database
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <strong>Export Ready:</strong> Data tables ready for export to CSV/Excel
                      </li>
                    </ul>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </RoleAwareLayout>
  );
}

