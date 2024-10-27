"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "../../../shared/AdminLayout";
import PricelistAdd from "./pricelist-new";

export default function PricelistPage() {
  const [showModal, setShowModal] = useState(false);
  const [pricelists, setPricelists] = useState([]);
  const [pricelistItems, setPricelistItems] = useState([]);
  const [selectedPricelistId, setSelectedPricelistId] = useState(null);

  useEffect(() => {
    async function fetchPricelists() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/pricelists", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setPricelists(data);
      } catch (error) {
        console.error("Failed to fetch pricelists", error);
      }
    }

    fetchPricelists();
  }, []);

  useEffect(() => {
    if (selectedPricelistId) {
      fetchPricelistItems(selectedPricelistId);
    }
  }, [selectedPricelistId]);

  const fetchPricelistItems = async (pricelistId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/pricelist/${pricelistId}/items`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setPricelistItems(data);
    } catch (error) {
      console.error("Failed to fetch pricelist items", error);
    }
  };

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);
  const handleAddPricelist = async ({ name, description }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/menu/pricelists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      });
      if (response.ok) {
        const newPricelist = await response.json();
        setPricelists([...pricelists, newPricelist]);
        handleCloseModal();
      } else {
        console.error("Failed to add pricelist");
      }
    } catch (error) {
      console.error("Failed to add pricelist", error);
    }
  };

  return (
    <AdminLayout>
      <div className="row">
        <div className="col-4">
          <button onClick={handleShowModal} className="btn btn-primary">
            Add Pricelist
          </button>
          <PricelistAdd
            showModal={showModal}
            handleCloseModal={handleCloseModal}
            handleAddPricelist={handleAddPricelist}
          />
          <table className="table table-striped mt-3">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pricelists.map((pricelist) => (
                <tr
                  key={pricelist.id}
                  onClick={() => setSelectedPricelistId(pricelist.id)}
                >
                  <td>{pricelist.id}</td>
                  <td>{pricelist.name}</td>
                  <td>{pricelist.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="col-8">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Pricelist ID</th>
                <th>Item ID</th>
                <th>Currency</th>
                <th>Price</th>
                <th>Created At</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {pricelistItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.pricelist_id}</td>
                  <td>{item.item_id}</td>
                  <td>{item.currency}</td>
                  <td>{item.price}</td>
                  <td>{item.created_at}</td>
                  <td>{item.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
