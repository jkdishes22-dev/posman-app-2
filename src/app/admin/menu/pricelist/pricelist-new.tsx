import React, { useState, useEffect } from "react";
import Image from "next/image";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";

export default function PricelistAdd({
  showModal,
  handleCloseModal,
  handleAddPricelist,
  addPricelistError,
  setAddPricelistError,
  addPricelistErrorDetails,
  setAddPricelistErrorDetails,
}) {
  const apiCall = useApiCall();
  const [name, setName] = useState("");
  const [station, setStation] = useState("");
  const [description, setDescription] = useState("");
  const [stations, setStations] = useState([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);

  useEffect(() => {
    async function fetchStations() {
      setIsLoadingStations(true);
      setAddPricelistError("");

      const result = await apiCall("/api/stations");

      if (result.status === 200) {
        setStations(result.data);
        setAddPricelistError(""); // Clear any previous errors
      } else if (result.status === 401) {
        setAddPricelistError("Authentication expired. Please log in again.");
      } else {
        setAddPricelistError(result.error || "Failed to fetch stations");
      }

      setIsLoadingStations(false);
    }
    if (showModal) {
      fetchStations();
    }
  }, [showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !station) {
      setAddPricelistError("Please fill in all fields");
      return;
    }

    try {
      await handleAddPricelist({ name, description, station });
      // Only clear form if successful (handled in parent component)
      if (!addPricelistError) {
        setName("");
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
