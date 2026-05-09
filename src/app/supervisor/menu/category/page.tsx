"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import CategoryItems from "../../../admin/menu/category/components/category/category-items";
import Categories from "../../../admin/menu/category/components/category/categories";
import CategoryDeleteModal from "../../../admin/menu/category/components/category/category-delete";
import { AuthError } from "../../../types/types";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

export default function SupervisorCategoryPage() {
  const apiCall = useApiCall();
  const [name, setName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemErrorDetails, setItemErrorDetails] = useState<ApiErrorResponse | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall("/api/menu/categories");
      if (result.status === 200) {
        // API returns array directly, not wrapped in {categories: [...]}
        setCategories(Array.isArray(result.data) ? result.data : []);
      } else {
        setError(result.error || "Failed to fetch categories");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      setError("Network error occurred");
      setErrorDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setFormError("Please fill in the category name");
      return;
    }

    try {
      setFormError(null);
      const result = await apiCall("/api/menu/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      if (result.status === 200 || result.status === 201) {
        // Success - apiCall handles all 2XX codes
        setFormError(null);
        // Ensure categories is always an array before spreading
        setCategories((prevCategories) => {
          const safePrev = Array.isArray(prevCategories) ? prevCategories : [];
          return [...safePrev, result.data];
        });
        setName("");
      } else {
        // Error - apiCall already standardizes all non-2XX errors
        setFormError(result.error || "Failed to create category");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error adding category:", error);
      setFormError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleCategoryClick = (category: any) => {
    setSelectedCategory(category);
    fetchItems(category.id);
  };

  const fetchItems = async (categoryId: string | number) => {
    try {
      setItemError(null);
      setItemErrorDetails(null);
      // Use 'category' parameter to match admin page and API endpoint
      const result = await apiCall(`/api/menu/items?category=${categoryId}`);
      if (result.status === 200) {
        // API returns array directly
        setItems(Array.isArray(result.data) ? result.data : []);
      } else {
        setItemError(result.error || "Failed to fetch items");
        setItemErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setItemError("Network error occurred");
      setItemErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      const result = await apiCall(`/api/menu/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (result.status === 200) {
        await fetchCategories();
        setShowDeleteModal(false);
        setSelectedCategory(null);
      } else {
        setFormError(result.error || "Failed to delete category");
      }
    } catch (error: any) {
      console.error("Error deleting category:", error);
      setFormError("Network error occurred");
    }
  };

  const handleAddItem = async (itemData) => {
    try {
      setItemError(null);
      setItemErrorDetails(null);
      const result = await apiCall("/api/menu/items", {
        method: "POST",
        body: JSON.stringify(itemData),
      });

      if (result.status === 200 || result.status === 201) {
        // Refresh items for the selected category
        if (selectedCategory) {
          await fetchItems(selectedCategory.id);
        }
      } else {
        setItemError(result.error || "Failed to add item");
        setItemErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error adding item:", error);
      setItemError("Network error occurred");
      setItemErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-grid me-2" aria-hidden></i>
            Menu Category Management
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Manage menu categories and items for supervisors</p>
        </PageHeaderStrip>

        {/* Error Display */}
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        {/* Main Content */}
        <div className="row g-2">
          {/* Add Category Section */}
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
                <form onSubmit={handleAddCategory}>
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
                  <button type="submit" className="btn btn-primary btn-sm">
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Category
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Categories Section */}
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
                  loading={loading}
                  onCategoryClick={handleCategoryClick}
                  onDeleteCategory={(category) => {
                    setSelectedCategory(category);
                    setShowDeleteModal(true);
                  }}
                  error={formError}
                  onErrorDismiss={() => setFormError(null)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category Items Section */}
        <div className="row mt-3">
          <div className="col-12">
            <CategoryItems
              selectedCategory={selectedCategory}
              items={items}
              itemError={itemError}
              fetchItems={fetchItems}
            />
          </div>
        </div>


        {/* Delete Category Modal */}
        {showDeleteModal && selectedCategory && (
          <CategoryDeleteModal
            show={showDeleteModal}
            categoryName={selectedCategory.name}
            onConfirm={() => handleDeleteCategory(selectedCategory?.id)}
            onCancel={() => {
              setShowDeleteModal(false);
              setSelectedCategory(null);
            }}
          />
        )}
      </div>
    </RoleAwareLayout>
  );
}
