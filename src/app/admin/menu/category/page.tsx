"use client";

import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import CategoryItems from "./components/category/category-items";
import Categories from "./components/category/categories";
import Image from "next/image";
import CategoryDeleteModal from "./components/category/category-delete";
import { AuthError } from "src/app/types/types";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useAuth } from "../../../contexts/AuthContext";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

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
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

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
      const result = await apiCall(`/api/menu/items?category=${categoryId}`);
      if (result.status === 200) {
        setItems(Array.isArray(result.data) ? result.data : []);
      } else if (result.status === 403) {
        setAuthError(result.data);
      } else {
        setItemError("Failed to fetch items: " + (result.error || "Unknown error"));
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setItemError("Failed to fetch items: " + error.message);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
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
        const result = await apiCall("/api/menu/categories");

        if (result.status === 401) {
          // Invalid token, logout and redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/";
          return;
        } else if (result.status === 403) {
          setAuthError(result.data);
        } else if (result.status === 200) {
          setCategories(result.data || []);
          setCategoriesLoaded(true);
        } else {
          setFetchError(result.error || `Request failed with status ${result.status}`);
          setErrorDetails(result.errorDetails);
        }
      } catch (error: any) {
        setFetchError(error.message || 'Network error');
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      }
    };
    fetchCategories();
  }, [categoriesLoaded]); // Only depend on categoriesLoaded

  return (
    <RoleAwareLayout>
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
                  categories={categories}
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
            <ErrorDisplay
              error={errorDetails?.message || null}
              errorDetails={errorDetails}
              onDismiss={() => setErrorDetails(null)}
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
    </RoleAwareLayout>
  );
};

export default CategoryPage;
