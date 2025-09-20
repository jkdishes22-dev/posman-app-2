"use client";

import RoleAwareLayout from "../../shared/RoleAwareLayout";
import React, { useState } from "react";
import { Button, Alert, Card, Row, Col } from "react-bootstrap";
import BillingSection from "../../shared/BillingSection";
import { useStation } from "../../contexts/StationContext";
import StationSelector from "../../components/StationSelector";

export default function SupervisorBillingPage() {
  const { currentStation, isLoading: stationLoading } = useStation();

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Station Management */}
        <div className="row mb-4">
          <div className="col-12">
            <Card>
              <Card.Body>
                <Row className="align-items-center">
                  <Col md={6}>
                    {currentStation ? (
                      <div>
                        <h6 className="text-success mb-1">
                          <i className="bi bi-check-circle me-1"></i>
                          Current Station
                        </h6>
                        <p className="mb-0">
                          <strong>{currentStation.name}</strong>
                          {currentStation.description && (
                            <span className="text-muted"> - {currentStation.description}</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h6 className="text-warning mb-1">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          No Station Selected
                        </h6>
                        <p className="mb-0 text-muted">Please select a station to enable billing operations</p>
                      </div>
                    )}
                  </Col>
                  <Col md={6} className="text-end">
                    <StationSelector />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Billing Section */}
        {currentStation ? (
          <div className="row">
            <div className="col-12">
              <BillingSection />
            </div>
          </div>
        ) : (
          <div className="row">
            <div className="col-12">
              <Card>
                <Card.Body className="text-center py-5">
                  <i className="bi bi-building fs-1 text-muted mb-3"></i>
                  <h5 className="text-muted">Station Required</h5>
                  <p className="text-muted mb-4">
                    Please select a station to access billing operations.
                    This ensures bills are properly associated with the correct location.
                  </p>
                  <StationSelector size="lg" />
                </Card.Body>
              </Card>
            </div>
          </div>
        )}

      </div>
    </RoleAwareLayout>
  );
}
