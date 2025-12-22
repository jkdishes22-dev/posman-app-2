"use client";
import React, { useState, useEffect } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Row, Col, Badge, Button, Table, Spinner } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import ErrorDisplay from "../components/ErrorDisplay";
import { ApiErrorResponse } from "../utils/errorUtils";
import { useRouter } from "next/navigation";

interface LowStockItem {
  item_id: number;
  item: {
    id: number;
    name: string;
    code: string;
  };
  available_quantity: number;
  min_stock_level: number | null;
  reorder_point: number | null;
  is_low_stock: boolean;
}

export default function StorekeeperPage() {
  const apiCall = useApiCall();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    recentMovements: 0
  });

  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  useEffect(() => {
    fetchLowStockItems();
  }, [apiCall]);

  const fetchLowStockItems = async () => {
    setIsLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      const result = await apiCall("/api/inventory/low-stock");
      if (result.status >= 200 && result.status < 300) {
        const items = Array.isArray(result.data) ? result.data : [];
        setLowStockItems(items);

        // Calculate stats
        const outOfStock = items.filter(item => item.available_quantity === 0).length;
        setStats({
          totalItems: 0, // TODO: Fetch total items count
          lowStockItems: items.length,
          outOfStockItems: outOfStock,
          recentMovements: 0, // TODO: Fetch recent movements count
        });
      } else {
        setError(result.error || "Failed to fetch low stock items");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const clearErrors = () => {
    setError(null);
    setErrorDetails(null);
  };

  if (isLoading) {
    return (
      <RoleAwareLayout>
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        </div>
      </RoleAwareLayout>
    );
  }

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0 fw-bold">
              <i className="bi bi-boxes me-2"></i>
              Inventory Dashboard
            </h1>
            <div>
              <Button
                variant="light"
                size="sm"
                className="me-2"
                onClick={() => router.push("/storekeeper/suppliers")}
              >
                <i className="bi bi-truck me-1"></i>
                Suppliers
              </Button>
              <Button
                variant="light"
                size="sm"
                onClick={() => router.push("/storekeeper/purchase-orders")}
              >
                <i className="bi bi-cart-check me-1"></i>
                Purchase Orders
              </Button>
            </div>
          </div>
        </div>

        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={clearErrors}
        />

        {/* Key Metrics */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <div className="text-primary mb-2">
                  <i className="bi bi-box fs-1"></i>
                </div>
                <h3 className="fw-bold">{stats.totalItems}</h3>
                <p className="text-muted mb-0">Total Items</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <div className="text-warning mb-2">
                  <i className="bi bi-exclamation-triangle fs-1"></i>
                </div>
                <h3 className="fw-bold">{stats.lowStockItems}</h3>
                <p className="text-muted mb-0">Low Stock</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <div className="text-danger mb-2">
                  <i className="bi bi-x-circle fs-1"></i>
                </div>
                <h3 className="fw-bold">{stats.outOfStockItems}</h3>
                <p className="text-muted mb-0">Out of Stock</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <div className="text-info mb-2">
                  <i className="bi bi-arrow-left-right fs-1"></i>
                </div>
                <h3 className="fw-bold">{stats.recentMovements}</h3>
                <p className="text-muted mb-0">Recent Movements</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Main Content */}
        <Row>
          {/* Low Stock Alerts */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
                    Low Stock Alerts
                  </h5>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => router.push("/storekeeper/purchase-orders?action=create")}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Create PO
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="list-group list-group-flush">
                  {lowStockItems.length === 0 ? (
                    <div className="list-group-item text-center text-muted py-4">
                      <i className="bi bi-check-circle fs-3 d-block mb-2"></i>
                      No low stock items
                    </div>
                  ) : (
                    lowStockItems.map((item) => (
                      <div key={item.item_id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                        <div>
                          <h6 className="mb-1 fw-semibold">{item.item.name}</h6>
                          <small className="text-muted">
                            Current: {item.available_quantity} | Min: {item.min_stock_level || "N/A"}
                            {item.reorder_point && ` | Reorder: ${item.reorder_point}`}
                          </small>
                        </div>
                        <Badge bg={item.available_quantity === 0 ? "danger" : "warning"}>
                          {item.min_stock_level
                            ? Math.round((item.available_quantity / item.min_stock_level) * 100)
                            : "N/A"}%
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Quick Actions */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-lightning-charge me-2 text-primary"></i>
                    Quick Actions
                  </h5>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    onClick={() => router.push("/storekeeper/suppliers")}
                  >
                    <i className="bi bi-truck me-2"></i>
                    Manage Suppliers
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => router.push("/storekeeper/purchase-orders")}
                  >
                    <i className="bi bi-cart-check me-2"></i>
                    Purchase Orders
                  </Button>
                  <Button
                    variant="info"
                    onClick={() => router.push("/storekeeper/inventory")}
                  >
                    <i className="bi bi-box-seam me-2"></i>
                    Inventory Details
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Low Stock Items Table */}
        {lowStockItems.length > 0 && (
          <Row>
            <Col lg={12}>
              <Card>
                <Card.Header className="bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">
                      <i className="bi bi-list-ul me-2 text-primary"></i>
                      Low Stock Items
                    </h5>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => router.push("/storekeeper/inventory")}
                    >
                      <i className="bi bi-eye me-1"></i>
                      View All Inventory
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Code</th>
                        <th>Available Stock</th>
                        <th>Min Level</th>
                        <th>Reorder Point</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((item) => (
                        <tr key={item.item_id}>
                          <td>{item.item.name}</td>
                          <td><code>{item.item.code}</code></td>
                          <td>{item.available_quantity}</td>
                          <td>{item.min_stock_level || "N/A"}</td>
                          <td>{item.reorder_point || "N/A"}</td>
                          <td>
                            <Badge bg={item.available_quantity === 0 ? "danger" : "warning"}>
                              {item.available_quantity === 0 ? "Out of Stock" : "Low Stock"}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-1"
                              onClick={() => router.push(`/storekeeper/inventory?itemId=${item.item_id}`)}
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => router.push(`/storekeeper/purchase-orders?action=create&itemId=${item.item_id}`)}
                            >
                              <i className="bi bi-cart-plus"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </RoleAwareLayout>
  );
}
