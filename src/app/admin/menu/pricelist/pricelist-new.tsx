import React, { useState, useEffect } from "react";
import Image from "next/image";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

export default function PricelistAdd({
  showModal,
  handleCloseModal,
  handleAddPricelist,
  addPricelistError,
  setAddPricelistError,
  addPricelistErrorDetails,
  setAddPricelistErrorDetails,
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [station, setStation] = useState("");
  const [description, setDescription] = useState("");
  const [stations, setStations] = useState([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  const apiCall = useApiCall();

  useEffect(() => {
    async function fetchStations() {
      setIsLoadingStations(true);
      setAddPricelistError("");
      setError(null);
      setErrorDetails(null);

      try {
        const result = await apiCall("/api/stations");
        if (result.status === 200) {
          setStations(result.data);
          setAddPricelistError(""); // Clear any previous errors
          setError(null);
          setErrorDetails(null);
        } else {
          setError(result.error || "Failed to fetch stations");
          setErrorDetails(result.errorDetails);
          setAddPricelistError(result.error || "Failed to fetch stations");
        }
      } catch (error: any) {
        setError("Network error occurred");
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        setAddPricelistError("Network error occurred");
      } finally {
        setIsLoadingStations(false);
      }
    }
    if (showModal) {
      fetchStations();
    }
  }, [showModal, apiCall]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !station) {
      setAddPricelistError("Please fill in all required fields");
      return;
    }

    try {
      await handleAddPricelist({ name, code: code || undefined, description, station });
      // Only clear form if successful (handled in parent component)
      if (!addPricelistError) {
        setName("");
        setCode("");
        setDescription("");
        setStation("");
      }
    } catch (error: any) {
      setAddPricelistError("Failed to add pricelist: " + error.message);
    }
  };

  if (!showModal) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-tags me-2"></i>
              Add Pricelist
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleCloseModal}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <ErrorDisplay
              error={addPricelistError}
              onDismiss={() => {
                setAddPricelistError(null);
                setAddPricelistErrorDetails(null);
              }}
              errorDetails={addPricelistErrorDetails}
            />
            <ErrorDisplay
              error={error}
              errorDetails={errorDetails}
              onDismiss={() => {
                setError(null);
                setErrorDetails(null);
              }}
            />
            <form className="px-4 py-3" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="code" className="form-label">
                  Code <span className="text-muted small">(optional)</span>
                </label>
                <input
                  type="text"
                  id="code"
                  className="form-control"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter unique code"
                />
              </div>
              <div className="form-group">
                <label htmlFor="station" className="form-label">
                  Station
                </label>
                <select
                  className="form-control"
                  id="station"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  required
                  disabled={isLoadingStations}
                >
                  <option value="">
                    {isLoadingStations ? "Loading stations..." : "Select station"}
                  </option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
                {isLoadingStations && (
                  <div className="mt-2">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <small className="text-muted ms-2">Loading stations...</small>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  id="description"
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-1"></i>
                  Add Pricelist
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
