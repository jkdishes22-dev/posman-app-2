"use client";

import RoleAwareLayout from "../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../components/ErrorDisplay";
import { useApiCall } from "../../utils/apiUtils";
import { ApiErrorResponse } from "../../utils/errorUtils";

interface DailyProduction {
  id: number;
  date: string;
  itemName: string;
  quantity: number;
  status: string;
  notes?: string;
}

export default function SupervisorDailyProductionPage() {
  const [productions, setProductions] = useState<DailyProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const apiCall = useApiCall();

  useEffect(() => {
    fetchDailyProductions();
  }, [selectedDate]);

  const fetchDailyProductions = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall(`/api/production/daily?date=${selectedDate}`);
      if (result.status === 200) {
        setProductions(result.data.productions || []);
      } else {
        setError(result.error || "Failed to fetch daily productions");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduction = async (productionData) => {
    try {
      setFormError(null);
      const result = await apiCall("/api/production/daily", {
        method: "POST",
        body: JSON.stringify(productionData),
      });

      if (result.status === 200 || result.status === 201) {
        await fetchDailyProductions();
        setShowModal(false);
      } else {
        setFormError(result.error || "Failed to add daily production");
      }
    } catch (error) {
      setFormError("Network error occurred");
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Daily Production</h1>
            <p className="text-muted">Manage daily production records for supervisors</p>
          </div>
        </div>

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
                <div>
                  <h5 className="card-title mb-0">Daily Production Records</h5>
                  <div className="mt-2">
                    <label htmlFor="dateFilter" className="form-label me-2">
                      Select Date:
                    </label>
                    <input
                      type="date"
                      id="dateFilter"
                      className="form-control d-inline-block w-auto"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setShowModal(true)}
                >
                  <i className="bi bi-plus me-1"></i>
                  Add Production
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
                          <th>Date</th>
                          <th>Item Name</th>
                          <th>Quantity</th>
                          <th>Status</th>
                          <th>Notes</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productions.map((production) => (
                          <tr key={production.id}>
                            <td>{production.id}</td>
                            <td>{new Date(production.date).toLocaleDateString()}</td>
                            <td>{production.itemName}</td>
                            <td>{production.quantity}</td>
                            <td>
                              <span
                                className={`badge ${production.status === "completed" ? "bg-success" :
                                  production.status === "in_progress" ? "bg-warning" : "bg-secondary"
                                  }`}
                              >
                                {production.status}
                              </span>
                            </td>
                            <td>{production.notes || "-"}</td>
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

        {/* Add Production Modal */}
        {showModal && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Daily Production</h5>
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
                      handleAddProduction({
                        date: formData.get("date"),
                        itemName: formData.get("itemName"),
                        quantity: parseInt(formData.get("quantity") as string),
                        status: formData.get("status"),
                        notes: formData.get("notes"),
                      });
                    }}
                  >
                    <div className="mb-3">
                      <label htmlFor="productionDate" className="form-label">
                        Date
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        id="productionDate"
                        name="date"
                        defaultValue={selectedDate}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="itemName" className="form-label">
                        Item Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="itemName"
                        name="itemName"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="quantity" className="form-label">
                        Quantity
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        id="quantity"
                        name="quantity"
                        min="1"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="status" className="form-label">
                        Status
                      </label>
                      <select className="form-select" id="status" name="status" required>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="notes" className="form-label">
                        Notes
                      </label>
                      <textarea
                        className="form-control"
                        id="notes"
                        name="notes"
                        rows={3}
                      ></textarea>
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
                        Add Production
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
