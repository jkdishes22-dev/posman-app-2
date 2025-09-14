"use client";
import React, { useState, useEffect } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Row, Col, Badge, Button, Table } from "react-bootstrap";

export default function SalesPage() {
  const [stats, setStats] = useState({
    todaySales: 0,
    activeBills: 0,
    completedBills: 0,
    averageBillValue: 0
  });

  const [activeBills, setActiveBills] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setStats({
        todaySales: 3240,
        activeBills: 5,
        completedBills: 23,
        averageBillValue: 45.20
      });

      setActiveBills([
        { id: 1, table: 'A1', items: 3, total: 45.50, status: 'active' },
        { id: 2, table: 'B2', items: 2, total: 32.00, status: 'active' },
        { id: 3, table: 'C3', items: 4, total: 67.25, status: 'active' }
      ]);

      setRecentActivity([
        { id: 1, type: 'bill', description: 'Bill #1234 completed', amount: 45.50, time: '5 min ago' },
        { id: 2, type: 'payment', description: 'Payment received for #1233', amount: 32.00, time: '12 min ago' },
        { id: 3, type: 'bill', description: 'New bill #1235 created', amount: 0, time: '18 min ago' }
      ]);

      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <RoleAwareLayout>
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
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
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0 fw-bold">
              <i className="bi bi-receipt me-2"></i>
              Sales Dashboard
            </h1>
            <Badge bg="light" text="dark" className="fs-6">
              Sales
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <div className="text-success mb-2">
                  <i className="bi bi-currency-dollar fs-1"></i>
                </div>
                <h3 className="fw-bold">${stats.todaySales.toLocaleString()}</h3>
                <p className="text-muted mb-0">Today's Sales</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <div className="text-primary mb-2">
                  <i className="bi bi-receipt fs-1"></i>
                </div>
                <h3 className="fw-bold">{stats.activeBills}</h3>
                <p className="text-muted mb-0">Active Bills</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <div className="text-info mb-2">
                  <i className="bi bi-check-circle fs-1"></i>
                </div>
                <h3 className="fw-bold">{stats.completedBills}</h3>
                <p className="text-muted mb-0">Completed Today</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <div className="text-warning mb-2">
                  <i className="bi bi-graph-up fs-1"></i>
                </div>
                <h3 className="fw-bold">${stats.averageBillValue}</h3>
                <p className="text-muted mb-0">Avg Bill Value</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <Row className="mb-4">
          <Col lg={12}>
            <Card>
              <Card.Header className="bg-light">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-lightning me-2 text-primary"></i>
                  Quick Actions
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <Button variant="success" size="lg" className="w-100 mb-2">
                      <i className="bi bi-plus-circle me-2"></i>
                      New Bill
                    </Button>
                  </Col>
                  <Col md={3}>
                    <Button variant="primary" size="lg" className="w-100 mb-2">
                      <i className="bi bi-search me-2"></i>
                      Search Items
                    </Button>
                  </Col>
                  <Col md={3}>
                    <Button variant="info" size="lg" className="w-100 mb-2">
                      <i className="bi bi-person me-2"></i>
                      Customer Lookup
                    </Button>
                  </Col>
                  <Col md={3}>
                    <Button variant="warning" size="lg" className="w-100 mb-2">
                      <i className="bi bi-clock-history me-2"></i>
                      Bill History
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Main Content */}
        <Row>
          {/* Active Bills */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-receipt me-2 text-primary"></i>
                    Active Bills
                  </h5>
                  <Button variant="primary" size="sm">
                    <i className="bi bi-plus-circle me-1"></i>
                    New Bill
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="list-group list-group-flush">
                  {activeBills.map((bill) => (
                    <div key={bill.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                      <div>
                        <h6 className="mb-1 fw-semibold">Table {bill.table}</h6>
                        <small className="text-muted">
                          {bill.items} items | ${bill.total}
                        </small>
                      </div>
                      <div className="d-flex gap-1">
                        <Button variant="outline-primary" size="sm">
                          <i className="bi bi-eye"></i>
                        </Button>
                        <Button variant="outline-success" size="sm">
                          <i className="bi bi-check"></i>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Recent Activity */}
          <Col lg={6} className="mb-4">
            <Card className="h-100">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-clock-history me-2 text-primary"></i>
                    Recent Activity
                  </h5>
                  <Button variant="outline-primary" size="sm">
                    <i className="bi bi-eye me-1"></i>
                    View All
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="list-group list-group-flush">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                      <div className="d-flex align-items-center">
                        <div className={`me-3 p-2 rounded-circle ${activity.type === 'bill' ? 'bg-primary' : 'bg-success'
                          }`}>
                          <i className={`bi ${activity.type === 'bill' ? 'bi-receipt' : 'bi-credit-card'
                            } text-white`}></i>
                        </div>
                        <div>
                          <h6 className="mb-1 fw-semibold">{activity.description}</h6>
                          <small className="text-muted">{activity.time}</small>
                        </div>
                      </div>
                      {activity.amount > 0 && (
                        <Badge bg="success">${activity.amount}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Menu Items Quick Access */}
        <Row>
          <Col lg={12}>
            <Card>
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-list-ul me-2 text-primary"></i>
                    Popular Items
                  </h5>
                  <Button variant="outline-primary" size="sm">
                    <i className="bi bi-search me-1"></i>
                    Search All Items
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <Card className="text-center h-100">
                      <Card.Body>
                        <div className="text-primary mb-2">
                          <i className="bi bi-cup fs-2"></i>
                        </div>
                        <h6 className="fw-semibold">Coffee</h6>
                        <p className="text-muted small mb-2">$3.50</p>
                        <Button variant="outline-primary" size="sm">
                          Add to Bill
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center h-100">
                      <Card.Body>
                        <div className="text-success mb-2">
                          <i className="bi bi-cake fs-2"></i>
                        </div>
                        <h6 className="fw-semibold">Sandwich</h6>
                        <p className="text-muted small mb-2">$8.50</p>
                        <Button variant="outline-primary" size="sm">
                          Add to Bill
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center h-100">
                      <Card.Body>
                        <div className="text-info mb-2">
                          <i className="bi bi-droplet fs-2"></i>
                        </div>
                        <h6 className="fw-semibold">Juice</h6>
                        <p className="text-muted small mb-2">$4.00</p>
                        <Button variant="outline-primary" size="sm">
                          Add to Bill
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center h-100">
                      <Card.Body>
                        <div className="text-warning mb-2">
                          <i className="bi bi-cookie fs-2"></i>
                        </div>
                        <h6 className="fw-semibold">Cookie</h6>
                        <p className="text-muted small mb-2">$2.50</p>
                        <Button variant="outline-primary" size="sm">
                          Add to Bill
                        </Button>
                      </Card.Body>
                    </Card>
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
