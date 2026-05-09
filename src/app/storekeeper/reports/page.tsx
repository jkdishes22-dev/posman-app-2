"use client";

import React from "react";
import Link from "next/link";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import { Card, Row, Col } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const REPORT_LINKS: { id: string; label: string; path: string; icon: string; description: string }[] = [
  { id: "dashboard", label: "Reports dashboard", path: "/admin/reports", icon: "bi-speedometer2", description: "Overview and quick links" },
  { id: "sales-revenue", label: "Sales revenue", path: "/admin/reports/sales-revenue", icon: "bi-currency-dollar", description: "Revenue by period" },
  { id: "production-stock", label: "Production / stock revenue", path: "/admin/reports/production-stock-revenue", icon: "bi-box-seam", description: "Issued stock vs revenue" },
  { id: "items-sold", label: "Items sold count", path: "/admin/reports/items-sold-count", icon: "bi-cart", description: "Volume by item" },
  { id: "voided", label: "Voided items", path: "/admin/reports/voided-items", icon: "bi-exclamation-triangle", description: "Voids and adjustments" },
  { id: "expenditure", label: "Expenditure", path: "/admin/reports/expenditure", icon: "bi-cash-stack", description: "Costs and spend" },
  { id: "invoices", label: "Invoices & pending bills", path: "/admin/reports/invoices-pending-bills", icon: "bi-file-earmark-text", description: "Billing status" },
  { id: "po", label: "Purchase orders", path: "/admin/reports/purchase-orders", icon: "bi-cart-check", description: "PO reporting" },
  { id: "pnl", label: "Profit and loss", path: "/admin/reports/pnl", icon: "bi-graph-up-arrow", description: "P and L summary" },
  {
    id: "reconciliation",
    label: "Production / sales reconciliation",
    path: "/admin/reports/production-sales-reconciliation",
    icon: "bi-arrow-left-right",
    description: "Issued production vs sales",
  },
];

export default function StorekeeperReportsPage() {
  return (
    <RoleAwareLayout>
      <div className="container-fluid py-4">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-bar-chart me-2" aria-hidden />
            Reports
          </h1>
          <p className="mb-0 mt-2 small text-white-50">
            Open a report (same routes as supervisor). Access depends on your permissions.
          </p>
        </PageHeaderStrip>

        <Row className="g-3">
          {REPORT_LINKS.map((r) => (
            <Col key={r.id} md={6} lg={4}>
              <Link href={r.path} className="text-decoration-none text-reset">
                <Card className="h-100 shadow-sm border-0">
                  <Card.Body>
                    <div className="d-flex align-items-start gap-2">
                      <i className={`bi ${r.icon} fs-4 text-primary`} />
                      <div>
                        <Card.Title className="h6 mb-1">{r.label}</Card.Title>
                        <Card.Text className="small text-muted mb-0">{r.description}</Card.Text>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </div>
    </RoleAwareLayout>
  );
}
