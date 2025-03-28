import React, { useState, useEffect } from "react";
import Image from "next/image";

export default function PricelistAdd({
  showModal,
  handleCloseModal,
  handleAddPricelist,
}) {
  const [name, setName] = useState("");
  const [station, setStation] = useState("");
  const [description, setDescription] = useState("");
  const [stations, setStations] = useState([]);
  const [addPricelistError, setAddPricelistError] = useState("");

  useEffect(() => {
    async function fetchStations() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/station?status=enabled", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setStations(data);
      } catch (error) {
        setAddPricelistError("Failed to fetch stations: " + error.message);
      }
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
      handleAddPricelist({ name, description, station });
      setName("");
      setDescription("");
      setStation("");
      setAddPricelistError("");
    } catch (error) {
      setAddPricelistError("Failed to add pricelist: " + error.message);
    }
  };

  if (!showModal) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Pricelist</h5>
            <button type="button" className="close" onClick={handleCloseModal}>
              <span>&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {addPricelistError && (
              <p style={{ color: "red" }}>{addPricelistError}</p>
            )}
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
                >
                  <option value="">Select station</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
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
                <button type="submit" className="btn btn-primary">
                  <Image
                    src="/icons/plus-circle.svg"
                    alt="Add Pricelist"
                    width={24}
                    height={24}
                    className="m-2"
                  />
                  Add pricelist
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
