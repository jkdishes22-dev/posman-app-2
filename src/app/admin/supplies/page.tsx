"use client";
import React from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { Card, Row, Col, Button } from "react-bootstrap";
import { useRouter } from "next/navigation";

export default function SuppliesPage() {
  const router = useRouter();

  const suppliesFeatures = [
    {
      title: "Suppliers",
      description: "Manage supplier database, contacts, and financial information",
      icon: "bi-building",
      color: "primary",
      path: "/storekeeper/suppliers"
    },
    {
      title: "Purchase Orders",
      description: "Create, track, and receive purchase orders from suppliers",
      icon: "bi-cart-check",
      color: "success",
      path: "/storekeeper/purchase-orders"
    },
    {
      title: "Inventory",
      description: "View inventory levels, low stock alerts, and manage stock",
      icon: "bi-boxes",
      color: "info",
      path: "/storekeeper"
    }
  ];

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-4 mb-4 rounded">
          <h1 className="h3 mb-0 fw-bold">
            <i className="bi bi-truck me-2"></i>
            Supplies Management
          </h1>
          <p className="mb-0 text-white-50">Manage suppliers, purchase orders, and inventory</p>
        </div>

        {/* Supplies Features Grid */}
        <Row className="g-4">
          {suppliesFeatures.map((feature, index) => (
            <Col key={index} md={6} lg={4}>
              <Card
                className="h-100 shadow-sm border-0"
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out"
                }}
                onClick={() => router.push(feature.path)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
                }}
              >
                <Card.Body className="p-4">
                  <div className={`text-${feature.color} mb-3`}>
                    <i className={`bi ${feature.icon} fs-1`}></i>
                  </div>
                  <Card.Title className="h5 fw-bold mb-2">{feature.title}</Card.Title>
                  <Card.Text className="text-muted mb-3">{feature.description}</Card.Text>
                  <Button variant={feature.color} className="w-100">
                    <i className="bi bi-arrow-right me-2"></i>
                    Open {feature.title}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </RoleAwareLayout>
  );
}

