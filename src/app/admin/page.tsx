"use client";

import { useState } from "react";
import { Card, Row, Col, Button } from "react-bootstrap";
import { useRouter } from "next/navigation";

import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import SecureRoute from "../components/SecureRoute";

export default function AdminPage() {
  const router = useRouter();

  const adminFeatures = [
    {
      title: "User Management",
      description: "Manage users, roles, and permissions",
      icon: "bi-people",
      color: "primary",
      path: "/admin/users/view"
    },
    {
      title: "Menu Management",
      description: "Manage categories and menu items",
      icon: "bi-grid",
      color: "success",
      path: "/admin/menu/category"
    },
    {
      title: "Pricelist Management",
      description: "Configure pricing and pricelists",
      icon: "bi-tags",
      color: "info",
      path: "/admin/menu/pricelist"
    },
    {
      title: "Station Management",
      description: "Manage POS stations and access",
      icon: "bi-building",
      color: "warning",
      path: "/admin/station"
    },
    {
      title: "Production Management",
      description: "Manage production and inventory",
      icon: "bi-gear",
      color: "secondary",
      path: "/admin/production"
    },
    {
      title: "Bill Management",
      description: "Process bills and help users with billing",
      icon: "bi-receipt",
      color: "danger",
      path: "/admin/bill"
    },
    {
      title: "Reports & Analytics",
      description: "View reports and system analytics",
      icon: "bi-graph-up",
      color: "dark",
      path: "/admin/reports"
    }
  ];

  return (
    <SecureRoute roleRequired="admin">
      <RoleAwareLayout>
        <div className="container-fluid">
          {/* Header */}
          <div className="bg-primary text-white p-4 mb-4 rounded">
            <h1 className="h3 mb-0 fw-bold">
              <i className="bi bi-shield-check me-2"></i>
              Admin Dashboard
            </h1>
            <p className="mb-0 text-white-50">Manage your POS system and users</p>
          </div>

          {/* Admin Features Grid */}
          <Row className="g-4">
            {adminFeatures.map((feature, index) => (
              <Col key={index} md={6} lg={4}>
                <Card
                  className="h-100 shadow-sm border-0 admin-feature-card"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onClick={() => router.push(feature.path)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                  }}
                >
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className={`bg-${feature.color} text-white rounded-circle p-3 me-3`}>
                        <i className={`bi ${feature.icon} fs-4`}></i>
                      </div>
                      <div>
                        <h5 className="mb-1 fw-bold">{feature.title}</h5>
                        <p className="text-muted mb-0 small">{feature.description}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <i className="bi bi-arrow-right text-primary"></i>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

        </div>
      </RoleAwareLayout>
    </SecureRoute>
  );
}
