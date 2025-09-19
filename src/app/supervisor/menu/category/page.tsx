"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import CategoryItems from "../../../admin/menu/category/components/category/category-items";
import Categories from "../../../admin/menu/category/components/category/categories";
import Image from "next/image";
import CategoryDeleteModal from "../../../admin/menu/category/components/category/category-delete";
import { AuthError } from "../../../types/types";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

export default function SupervisorCategoryPage() {
  const apiCall = useApiCall();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
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
        setCategories(result.data.categories || []);
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

  const handleAddCategory = async (categoryData) => {
    try {
      setFormError(null);
      const result = await apiCall("/api/menu/categories", {
        method: "POST",
        body: JSON.stringify(categoryData),
      });

      if (result.status === 200 || result.status === 201) {
        await fetchCategories();
        setShowModal(false);
      } else {
        setFormError(result.error || "Failed to add category");
      }
    } catch (error: any) {
      console.error("Error adding category:", error);
      setFormError("Network error occurred");
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
        await fetchCategories();
      } else {
        setItemError(result.error || "Failed to add item");
        setItemErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error adding item:", error);
      setItemError("Network error occurred");
      setItemErrorDetails(null);
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Menu Category Management</h1>
            <p className="text-muted">Manage menu categories and items for supervisors</p>
          </div>
        </div>

        {/* Error Display */}
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        <div className="row">
          {/* Categories Section */}
          <div className="col-md-6">
            <Categories
              categories={categories}
              loading={loading}
              onAddCategory={() => setShowModal(true)}
              onDeleteCategory={(category) => {
                setSelectedCategory(category);
                setShowDeleteModal(true);
              }}
              error={formError}
              onErrorDismiss={() => setFormError(null)}
            />
          </div>

          {/* Category Items Section */}
          <div className="col-md-6">
            <CategoryItems
              categories={categories}
              onAddItem={handleAddItem}
              error={itemError}
              errorDetails={itemErrorDetails}
              onErrorDismiss={() => {
                setItemError(null);
                setItemErrorDetails(null);
              }}
            />
          </div>
        </div>

        {/* Add Category Modal */}
        {showModal && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New Category</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      handleAddCategory({
                        name: formData.get("name"),
                        description: formData.get("description"),
                      });
                    }}
                  >
                    <div className="mb-3">
                      <label htmlFor="categoryName" className="form-label">
                        Category Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="categoryName"
                        name="name"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="categoryDescription" className="form-label">
                        Description
                      </label>
                      <textarea
                        className="form-control"
                        id="categoryDescription"
                        name="description"
                        rows={3}
                      ></textarea>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Add Category
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Category Modal */}
        {showDeleteModal && selectedCategory && (
          <CategoryDeleteModal
            category={selectedCategory}
            onConfirm={handleDeleteCategory}
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
