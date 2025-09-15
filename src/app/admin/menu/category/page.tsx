"use client";

import AdminLayout from "../../../shared/AdminLayout";
import React, { useState, useEffect } from "react";
import CategoryItems from "./components/category/category-items";
import Categories from "./components/category/categories";
import Image from "next/image";
import CategoryDeleteModal from "./components/category/category-delete";
import { AuthError } from "src/app/types/types";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useAuth } from "../../../contexts/AuthContext";
import { useApiCall } from "../../../utils/apiUtils";

const CategoryPage: React.FC = () => {
  const apiCall = useApiCall();

  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [items, setItems] = useState([]);
  const [itemError, setItemError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setFormError("Please fill in all fields");
      return;
    }
    const formData = { name };

    const result = await apiCall("/api/menu/categories", {
      method: "POST",
      body: JSON.stringify(formData),
    });

    if (result.status === 401) {
      // Already handled by apiCall utility
      return;
    } else if (result.status === 201) {
      setFormError("");
      setCategories((prevCategories) => [...prevCategories, result.data]);
      setName("");
    } else if (result.status === 400) {
      // Handle duplicate category error
      setFormError(result.data?.message || "Category already exists");
    } else if (result.status === 403) {
      setAuthError(result.data);
    } else {
      setFormError(result.data?.message || result.error || "Failed to create category");
    }
  };

  const fetchItems = async (categoryId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/menu/items?category=${categoryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setItems(Array.isArray(data) ? data : []);
      } else if (response.status === 403) {
        setAuthError(data);
      } else {
        setItemError("Failed to fetch items: " + (data.message || JSON.stringify(data)));
      }
    } catch (error: any) {
      setItemError("Failed to fetch items: " + error.message);
    }
  };

  const handleCategoryClick = (category: { id: string; name: string }) => {
    setSelectedCategory(category);
    fetchItems(category.id);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const result = await apiCall(`/api/menu/categories/${categoryId}`, {
      method: "DELETE",
    });

    if (result.status === 401) {
      // Already handled by apiCall utility
      return;
    } else if (result.status === 403) {
      setAuthError(result.data);
    } else if (result.status === 200) {
      setCategories((prevCategories) =>
        prevCategories.filter((category) => category.id !== categoryId)
      );
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    } else {
      setFormError(result.error || "Failed to delete category");
    }
  };

  const openDeleteModal = (category: { id: string; name: string }) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  useEffect(() => {
    if (categoriesLoaded) {
      return;
    }

    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/categories", {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.status === 401) {
          // Invalid token, logout and redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/";
          return;
        } else if (response.status === 403) {
          setAuthError(data);
        } else if (response.ok) {
          setCategories(data || []);
          setCategoriesLoaded(true);
        } else {
          setFetchError(data.message || `Request failed with status ${response.status}`);
        }
      } catch (error: any) {
        setFetchError(error.message || 'Network error');
      }
    };
    fetchCategories();
  }, [categoriesLoaded]); // Only depend on categoriesLoaded

  return (
    <AdminLayout authError={authError}>
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-grid me-2"></i>
            Menu Management
          </h1>
        </div>

        {/* Main Content */}
        <div className="row g-4">
          <div className="col-12 col-lg-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-plus-circle me-2 text-primary"></i>
                  Add Category
                </h5>
              </div>
              <div className="card-body">
                {formError && (
                  <div className="alert alert-danger mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {formError}
                    <button
                      type="button"
                      className="btn-close float-end"
                      onClick={() => setFormError(null)}
                      aria-label="Close"
                    ></button>
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="categoryName" className="form-label fw-semibold">
                      Category Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="categoryName"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (formError) setFormError(null); // Clear error when user starts typing
                      }}
                      placeholder="Enter category name"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100">
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Category
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-8">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-grid me-2 text-primary"></i>
                  Categories
                </h5>
              </div>
              <div className="card-body">
                <Categories
                  categories={categories || []}
                  onCategoryClick={handleCategoryClick}
                  fetchError={fetchError}
                  onDeleteCategory={openDeleteModal}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-12">
            <ErrorDisplay
              error={formError}
              onDismiss={() => setFormError(null)}
            />
            <ErrorDisplay
              error={fetchError}
              onDismiss={() => setFetchError(null)}
            />
            <CategoryItems
              selectedCategory={selectedCategory}
              items={items}
              itemError={itemError}
              fetchItems={fetchItems}
            />
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {categoryToDelete && (
        <CategoryDeleteModal
          show={showDeleteModal}
          categoryName={categoryToDelete.name}
          onConfirm={() => handleDeleteCategory(categoryToDelete.id)}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </AdminLayout>
  );
};

export default CategoryPage;
