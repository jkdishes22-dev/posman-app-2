"use client";
import React, { useState, useEffect } from "react";
import ViewItems from "../admin/menu/category/components/items/items-view";
import Categories from "../admin/menu/category/components/category/categories";

const BillingSection = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [itemError, setItemError] = useState("");
  const [itemTypes, setItemTypes] = useState([]);

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

  return (
    <div className="container">
      <div className="row">
        <div className="col-6">
          <Categories
            categories={categories}
            onCategoryClick={(category) => {
              setSelectedCategory(category);
              fetchItems(category.id);
            }}
            fetchError={fetchError}
            // No delete category function passed here
          />
        </div>
        <div className="col-6">
          <ViewItems
            selectedCategory={selectedCategory}
            items={items}
            itemError={itemError}
            // No add item or delete item handlers passed here
            itemTypes={itemTypes}
            setItems={setItems} // Keep this if you need to update the items list
          />
        </div>
      </div>
    </div>
  );
};
export default BillingSection;
