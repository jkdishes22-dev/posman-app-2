"use client";
import React, { useState, useEffect } from "react";
import AdminLayout from "src/app/shared/AdminLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Row, Col, Badge, Button, Table } from "react-bootstrap";

export default function StorekeeperPage() {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    recentMovements: 0
  });

  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setStats({
        totalItems: 156,
        lowStockItems: 8,
        outOfStockItems: 2,
        recentMovements: 12
      });
      
      setLowStockItems([
        { id: 1, name: 'Coffee Beans', current: 5, min: 10, unit: 'kg' },
        { id: 2, name: 'Milk', current: 3, min: 15, unit: 'liters' },
        { id: 3, name: 'Sugar', current: 2, min: 8, unit: 'kg' }
      ]);

      setRecentMovements([
        { id: 1, item: 'Coffee Beans', type: 'in', quantity: 50, unit: 'kg', time: '2 hours ago' },
        { id: 2, item: 'Milk', type: 'out', quantity: 10, unit: 'liters', time: '4 hours ago' },
        { id: 3, item: 'Sugar', type: 'in', quantity: 25, unit: 'kg', time: '1 day ago' }
      ]);
      
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0 fw-bold">
              <i className="bi bi-boxes me-2"></i>
              Inventory Management
            </h1>
            <Badge bg="light" text="dark" className="fs-6">
              Storekeeper
            </Badge>
          </div>
        </div>

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
                  <Button variant="warning" size="sm">
                    <i className="bi bi-plus-circle me-1"></i>
                    Reorder
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="list-group list-group-flush">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                      <div>
                        <h6 className="mb-1 fw-semibold">{item.name}</h6>
                        <small className="text-muted">
                          Current: {item.current} {item.unit} | Min: {item.min} {item.unit}
                        </small>
                      </div>
                      <Badge bg="warning">
                        {Math.round((item.current / item.min) * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Recent Stock Movements */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-arrow-left-right me-2 text-primary"></i>
                    Recent Movements
                  </h5>
                  <Button variant="outline-primary" size="sm">
                    <i className="bi bi-eye me-1"></i>
                    View All
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="list-group list-group-flush">
                  {recentMovements.map((movement) => (
                    <div key={movement.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                      <div className="d-flex align-items-center">
                        <div className={`me-3 p-2 rounded-circle ${
                          movement.type === 'in' ? 'bg-success' : 'bg-danger'
                        }`}>
                          <i className={`bi ${
                            movement.type === 'in' ? 'bi-arrow-down' : 'bi-arrow-up'
                          } text-white`}></i>
                        </div>
                        <div>
                          <h6 className="mb-1 fw-semibold">{movement.item}</h6>
                          <small className="text-muted">
                            {movement.type === 'in' ? 'Received' : 'Issued'} {movement.quantity} {movement.unit}
                          </small>
                        </div>
                      </div>
                      <small className="text-muted">{movement.time}</small>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Inventory Overview Table */}
        <Row>
          <Col lg={12}>
            <Card>
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-list-ul me-2 text-primary"></i>
                    Inventory Overview
                  </h5>
                  <div>
                    <Button variant="outline-primary" size="sm" className="me-2">
                      <i className="bi bi-plus-circle me-1"></i>
                      Add Item
                    </Button>
                    <Button variant="outline-success" size="sm">
                      <i className="bi bi-download me-1"></i>
                      Export
                    </Button>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>Min Level</th>
                      <th>Unit</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Coffee Beans</td>
                      <td>Beverages</td>
                      <td>5</td>
                      <td>10</td>
                      <td>kg</td>
                      <td><Badge bg="warning">Low Stock</Badge></td>
                      <td>
                        <Button variant="outline-primary" size="sm" className="me-1">
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button variant="outline-success" size="sm">
                          <i className="bi bi-plus"></i>
                        </Button>
                      </td>
                    </tr>
                    <tr>
                      <td>Milk</td>
                      <td>Dairy</td>
                      <td>3</td>
                      <td>15</td>
                      <td>liters</td>
                      <td><Badge bg="warning">Low Stock</Badge></td>
                      <td>
                        <Button variant="outline-primary" size="sm" className="me-1">
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button variant="outline-success" size="sm">
                          <i className="bi bi-plus"></i>
                        </Button>
                      </td>
                    </tr>
                    <tr>
                      <td>Bread</td>
                      <td>Bakery</td>
                      <td>0</td>
                      <td>5</td>
                      <td>pieces</td>
                      <td><Badge bg="danger">Out of Stock</Badge></td>
                      <td>
                        <Button variant="outline-primary" size="sm" className="me-1">
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button variant="outline-success" size="sm">
                          <i className="bi bi-plus"></i>
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </AdminLayout>
  );
}
