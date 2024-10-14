"use client";
import SecureRoute from "../../../components/SecureRoute";
import AdminLayout from "../../../shared/AdminLayout";
import React, { useState, useEffect } from "react";
import Image from "next/image";

const CategoryPage = () => {
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [itemError, setItemError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      setFormError("Please fill in all fields");
      return;
    }
    const formData = { name };
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/menu/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.status === 201) {
        setFormError("");
        const newCategory = await response.json();
        setCategories([...categories, newCategory]);
      } else {
        setFormError("Failed to create category");
      }
    } catch (e) {
      setFormError("Login failed" + e);
    }
  };

  const fetchItems = async (categoryId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/menu/items?category=${categoryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        setItemError("Failed to fetch items");
      }
    } catch (e) {
      setItemError("Failed to fetch items: " + e.message);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    fetchItems(category.id);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/categories", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        } else {
          setFetchError("Failed to fetch categories");
        }
      } catch (e) {
        setFetchError("Failed to fetch categories: " + e.message);
      }
    };
    fetchCategories();
  }, []);

  return (
    <SecureRoute roleRequired="admin">
      <AdminLayout>
        <div className="container p-1">
          <div className="row px-1">
            <div className="col-4">
              <div className="p-3 border bg-light">
                Add Category
                <form onSubmit={handleSubmit} className="px-4 py-3">
                  {formError && <p style={{ color: "red" }}>{formError}</p>}
                  <div className="form-group row">
                    <label className="col-sm-2 col-form-label">Name</label>
                    <div className="col-sm-10">
                      <input
                        type="text"
                        className="form-control"
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end mt-3">
                    <button type="submit" className="btn btn-primary">
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="col-8">
              <div className="p-2 border bg-light">
                {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}
                <div className="row">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="col-sm-3 mb-1"
                      onClick={() => handleCategoryClick(category)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="card">
                        <div className="card-body">
                          <h5 className="card-title">{category.name}</h5>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="row px-1">
            <div className="col mt-2">
              <div className="p-3 border bg-light">
                <div className="row">
                  <div className="col-10">
                    {selectedCategory
                      ? `${selectedCategory.name} Items`
                      : "Category items section"}
                  </div>
                  <div className="col border bg-primary-subtle border-1 border-primary-subtle">
                    <Image
                      src="/icons/plus-circle.svg"
                      alt="Add Item"
                      width={24}
                      height={24}
                      className="m-2"
                    />{" "}
                    Add item
                  </div>
                </div>
                {itemError && <p style={{ color: "red" }}>{itemError}</p>}
                <table className="table mt-3 stripped">
                  <thead>
                    <tr>
                      <th scope="col">Item name</th>
                      <th>Item code</th>
                      <th>Category</th>
                      <th>Item Type</th>
                      <th>Item price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.code}</td>
                        <td>{item.category.name}</td>
                        <td>{item.itemType.name}</td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </SecureRoute>
  );
};

export default CategoryPage;
