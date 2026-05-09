"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

interface ProductionDefinition {
  id: number;
  name: string;
  description: string;
  ratio: number;
  status: string;
}

export default function SupervisorProductionDefinitionsPage() {
  const [definitions, setDefinitions] = useState<ProductionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const apiCall = useApiCall();

  useEffect(() => {
    fetchDefinitions();
  }, []);

  const fetchDefinitions = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall("/api/production/definitions");
      if (result.status === 200) {
        setDefinitions(result.data.definitions || []);
      } else {
        setError(result.error || "Failed to fetch production definitions");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDefinition = async (definitionData) => {
    try {
      setFormError(null);
      const result = await apiCall("/api/production/definitions", {
        method: "POST",
        body: JSON.stringify(definitionData),
      });

      if (result.status === 200 || result.status === 201) {
        await fetchDefinitions();
        setShowModal(false);
      } else {
        setFormError(result.error || "Failed to add production definition");
      }
    } catch (error) {
      setFormError("Network error occurred");
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-sliders me-2" aria-hidden></i>
            Production Definitions
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Manage production ratio definitions for supervisors</p>
        </PageHeaderStrip>

        {/* Error Display */}
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Production Definitions</h5>
                <Button
                  variant="primary"
                  onClick={() => setShowModal(true)}
                >
                  <i className="bi bi-plus me-1"></i>
                  Add Definition
                </Button>
              </div>
              <div className="card-body">
                {formError && (
                  <div className="alert alert-danger" role="alert">
                    {formError}
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setFormError(null)}
                    ></button>
                  </div>
                )}

                {loading ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Description</th>
                          <th>Ratio</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {definitions.map((definition) => (
                          <tr key={definition.id}>
                            <td>{definition.id}</td>
                            <td>{definition.name}</td>
                            <td>{definition.description}</td>
                            <td>{definition.ratio}</td>
                            <td>
                              <span
                                className={`badge ${definition.status === "active" ? "bg-success" : "bg-secondary"
                                  }`}
                              >
                                {definition.status}
                              </span>
                            </td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => {
                                  // Handle edit functionality
                                }}
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Definition Modal */}
        {showModal && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Production Definition</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      handleAddDefinition({
                        name: formData.get("name"),
                        description: formData.get("description"),
                        ratio: parseFloat(formData.get("ratio") as string),
                        status: "active",
                      });
                    }}
                  >
                    <div className="mb-3">
                      <label htmlFor="definitionName" className="form-label">
                        Definition Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="definitionName"
                        name="name"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="definitionDescription" className="form-label">
                        Description
                      </label>
                      <textarea
                        className="form-control"
                        id="definitionDescription"
                        name="description"
                        rows={3}
                      ></textarea>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="definitionRatio" className="form-label">
                        Ratio
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        id="definitionRatio"
                        name="ratio"
                        required
                      />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Add Definition
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleAwareLayout>
  );
}
