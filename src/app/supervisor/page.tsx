"use client";
import React, { useState, useEffect } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Row, Col, Badge, Button } from "react-bootstrap";

export default function SupervisorPage() {
    const [stats, setStats] = useState({
        totalSales: 0,
        activeBills: 0,
        lowStockItems: 0,
        teamMembers: 0
    });

    const [recentActivity, setRecentActivity] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate data loading
        setTimeout(() => {
            setStats({
                totalSales: 15420,
                activeBills: 8,
                lowStockItems: 3,
                teamMembers: 12
            });
            setRecentActivity([
                { id: 1, type: 'sale', description: 'New bill #1234 created', time: '2 min ago' },
                { id: 2, type: 'inventory', description: 'Stock alert: Coffee beans low', time: '15 min ago' },
                { id: 3, type: 'payment', description: 'Payment processed for bill #1230', time: '1 hour ago' }
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
                            <i className="bi bi-graph-up me-2"></i>
                            Operations Dashboard
                        </h1>
                        <Badge bg="light" text="dark" className="fs-6">
                            Supervisor
                        </Badge>
                    </div>
                </div>

                {/* Key Metrics */}
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="text-center h-100">
                            <Card.Body>
                                <div className="text-primary mb-2">
                                    <i className="bi bi-currency-dollar fs-1"></i>
                                </div>
                                <h3 className="fw-bold">${stats.totalSales.toLocaleString()}</h3>
                                <p className="text-muted mb-0">Today's Sales</p>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center h-100">
                            <Card.Body>
                                <div className="text-success mb-2">
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
                                <div className="text-warning mb-2">
                                    <i className="bi bi-exclamation-triangle fs-1"></i>
                                </div>
                                <h3 className="fw-bold">{stats.lowStockItems}</h3>
                                <p className="text-muted mb-0">Low Stock Items</p>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center h-100">
                            <Card.Body>
                                <div className="text-info mb-2">
                                    <i className="bi bi-people fs-1"></i>
                                </div>
                                <h3 className="fw-bold">{stats.teamMembers}</h3>
                                <p className="text-muted mb-0">Team Members</p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Main Content */}
                <Row>
                    {/* Sales Management */}
                    <Col lg={6} className="mb-4">
                        <Card className="h-100">
                            <Card.Header className="bg-light">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fw-bold">
                                        <i className="bi bi-graph-up me-2 text-primary"></i>
                                        Sales Management
                                    </h5>
                                    <Button variant="primary" size="sm">
                                        <i className="bi bi-plus-circle me-1"></i>
                                        New Bill
                                    </Button>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                <div className="list-group list-group-flush">
                                    <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                                        <div>
                                            <h6 className="mb-1 fw-semibold">Active Bills</h6>
                                            <small className="text-muted">8 bills in progress</small>
                                        </div>
                                        <Badge bg="primary">8</Badge>
                                    </div>
                                    <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                                        <div>
                                            <h6 className="mb-1 fw-semibold">Today's Revenue</h6>
                                            <small className="text-muted">$15,420 total</small>
                                        </div>
                                        <Badge bg="success">+12%</Badge>
                                    </div>
                                    <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0">
                                        <div>
                                            <h6 className="mb-1 fw-semibold">Average Bill Value</h6>
                                            <small className="text-muted">$45.20 per bill</small>
                                        </div>
                                        <Badge bg="info">$45.20</Badge>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Team Management */}
                    <Col lg={6} className="mb-4">
                        <Card className="h-100">
                            <Card.Header className="bg-light">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fw-bold">
                                        <i className="bi bi-people me-2 text-primary"></i>
                                        Team Management
                                    </h5>
                                    <Button variant="outline-primary" size="sm">
                                        <i className="bi bi-gear me-1"></i>
                                        Manage
                                    </Button>
                                </div>
                            </Card.Header>
                            <Card.Body>
                                <div className="list-group list-group-flush">
                                    <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                                        <div>
                                            <h6 className="mb-1 fw-semibold">Sales Team</h6>
                                            <small className="text-muted">5 active sales staff</small>
                                        </div>
                                        <Badge bg="success">5</Badge>
                                    </div>
                                    <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                                        <div>
                                            <h6 className="mb-1 fw-semibold">Cashiers</h6>
                                            <small className="text-muted">3 active cashiers</small>
                                        </div>
                                        <Badge bg="info">3</Badge>
                                    </div>
                                    <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0">
                                        <div>
                                            <h6 className="mb-1 fw-semibold">Storekeepers</h6>
                                            <small className="text-muted">2 active storekeepers</small>
                                        </div>
                                        <Badge bg="warning">2</Badge>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Recent Activity */}
                <Row>
                    <Col lg={12}>
                        <Card>
                            <Card.Header className="bg-light">
                                <h5 className="mb-0 fw-bold">
                                    <i className="bi bi-clock-history me-2 text-primary"></i>
                                    Recent Activity
                                </h5>
                            </Card.Header>
                            <Card.Body>
                                <div className="list-group list-group-flush">
                                    {recentActivity.map((activity) => (
                                        <div key={activity.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                                            <div className="d-flex align-items-center">
                                                <div className={`me-3 p-2 rounded-circle ${activity.type === 'sale' ? 'bg-success' :
                                                    activity.type === 'inventory' ? 'bg-warning' : 'bg-info'
                                                    }`}>
                                                    <i className={`bi ${activity.type === 'sale' ? 'bi-receipt' :
                                                        activity.type === 'inventory' ? 'bi-box' : 'bi-credit-card'
                                                        } text-white`}></i>
                                                </div>
                                                <div>
                                                    <h6 className="mb-1 fw-semibold">{activity.description}</h6>
                                                    <small className="text-muted">{activity.time}</small>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </div>
        </RoleAwareLayout>
    );
}
