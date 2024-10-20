"use client";
import React, { useState, useEffect } from "react";
import ViewItems from "../admin/menu/category/components/items/items-view";
import Categories from "../admin/menu/category/components/category/categories";
import { Item } from "../admin/menu/category/types";
import QuantityModal from "./QuantityModal";
import jwt from "jsonwebtoken";
import { DecodedToken } from "../components/SecureRoute";

const BillingSection = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [itemError, setItemError] = useState("");
  const [itemTypes, setItemTypes] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [waitress, setWaitress] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decodedToken = jwt.decode(token) as DecodedToken;
    if (decodedToken && decodedToken.user) {
      setWaitress(decodedToken.user.firstName);
    }
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/categories", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        setFetchError("Failed to fetch categories: " + error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchItemTypes = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/items/types", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setItemTypes(data);
      } catch (error) {
        console.error("Error fetching item types:", error);
      }
    };

    fetchItemTypes();
  }, []);

  const fetchItems = async (categoryId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/menu/items?category=${categoryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      const data = await response.json();
      setItems(data);
    } catch (error) {
      setItemError("Failed to fetch items for the selected category: " + error);
    }
  };

  const handlePickItem = (item: Item) => {
    setCurrentItem(item);
    setShowQuantityModal(true);
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (currentItem) {
      // Check if the item already exists in selectedItems
      setSelectedItems((prev) => {
        const existingItemIndex = prev.findIndex(
          (i) => i.id === currentItem.id,
        );
        if (existingItemIndex >= 0) {
          // Update existing item's quantity and subtotal
          const updatedItems = [...prev];
          updatedItems[existingItemIndex].quantity = quantity;
          updatedItems[existingItemIndex].subtotal =
            currentItem.price * quantity;
          return updatedItems;
        } else {
          // Add new item with quantity and subtotal
          return [
            ...prev,
            {
              ...currentItem,
              quantity,
              subtotal: currentItem.price * quantity,
            },
          ];
        }
      });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("/api/picked-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedItems),
      });

      if (!response.ok) {
        throw new Error("Failed to submit picked items");
      }

      // Handle success (e.g., show a success message or reset the state)
      console.log("Items submitted successfully!");
    } catch (error) {
      console.error("Error submitting items:", error);
    }
  };

  // Calculate total amount
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );

  return (
    <div className="container">
      <div className="row">
        <div className="col-6">
          <ViewItems
            selectedCategory={selectedCategory}
            items={items}
            itemError={itemError}
            itemTypes={itemTypes}
            setItems={setItems}
            isBillingSection={true}
            onItemPick={handlePickItem}
          />
        </div>

        <div className="col">
          <h5>Billing</h5>
          <table className="table stripped">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Subtotal</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>${item.subtotal.toFixed(2)}</td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h5>Total Amount: ${totalAmount.toFixed(2)}</h5>
          <h5>Served By: {waitress}</h5>

          <button className="btn btn-success" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col mt-5">
          <Categories
            categories={categories}
            onCategoryClick={(category) => {
              setSelectedCategory(category);
              fetchItems(category.id);
            }}
            fetchError={fetchError}
          />
        </div>
      </div>

      {/* Quantity Modal */}
      {showQuantityModal && (
        <QuantityModal
          item={currentItem}
          onClose={() => setShowQuantityModal(false)}
          onConfirm={handleQuantityConfirm}
        />
      )}
    </div>
  );
};

export default BillingSection;
