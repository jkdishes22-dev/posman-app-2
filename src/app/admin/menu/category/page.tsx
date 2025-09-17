"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
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
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemErrorDetails, setItemErrorDetails] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [authErrorDetails, setAuthErrorDetails] = useState<any>(null);
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

    if (result.status === 200 || result.status === 201) {
      setCategories([...categories, result.data]);
      setName("");
      setFormError(null);
      setItemErrorDetails(null);
    } else if (result.status === 401) {
      // Already handled by apiCall utility
      return;
    } else {
      setFormError(result.error || "Failed to create category");
    }
  };

  const fetchItems = async (categoryId: string) => {
    const result = await apiCall(`/api/menu/items?category=${categoryId}`);

    if (result.status === 200) {
      setItems(Array.isArray(result.data) ? result.data : []);
      setItemError(null);
      setItemErrorDetails(null);
    } else {
      setItemError(result.error || "Failed to fetch items");
      setItemErrorDetails(result.errorDetails);
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

    if (result.status === 200) {
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
    const fetchCategories = async () => {
      if (categoriesLoaded) {
        return;
      }

      const result = await apiCall("/api/menu/categories");

      if (result.status === 200) {
        console.log('Categories API response:', { data: result.data, type: typeof result.data, isArray: Array.isArray(result.data) });
        setCategories(Array.isArray(result.data) ? result.data : []);
        setCategoriesLoaded(true);
      } else {
        setFetchError(result.error || `Request failed with status ${result.status}`);
      }
    };

    fetchCategories();
  }, [categoriesLoaded]); // Depend on categoriesLoaded

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
            <ErrorDisplay
              error={authError?.message}
              errorDetails={authErrorDetails}
              onDismiss={() => {
                setAuthError(null);
                setAuthErrorDetails(null);
              }}
            />
            <ErrorDisplay
              error={itemError}
              errorDetails={itemErrorDetails}
              onDismiss={() => {
                setItemError(null);
                setItemErrorDetails(null);
              }}
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
