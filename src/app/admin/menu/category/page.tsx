"use client";

import SecureRoute from "../../../components/SecureRoute";
import AdminLayout from "../../../shared/AdminLayout";
import React, { useState, useEffect } from "react";
import CategoryItems from "./components/category/category-items";
import Categories from "./components/category/categories";
import Image from "next/image";
import CategoryDeleteModal from "./components/category/category-delete";

const CategoryPage: React.FC = () => {
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [categories, setCategories] = useState([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
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
        setCategories((prevCategories) => [...prevCategories, newCategory]);
      } else {
        const errorData = await response.json();
        setFormError(errorData.message || "Failed to create category");
      }
    } catch (e) {
      setFormError("Login failed: " + e.message);
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

  const handleCategoryClick = (category: { id: string; name: string }) => {
    setSelectedCategory(category);
    fetchItems(category.id);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/menu/categories/${categoryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setCategories((prevCategories) =>
          prevCategories.filter((category) => category.id !== categoryId),
        );
        setShowDeleteModal(false);
        setCategoryToDelete(null);
      } else {
        const errorData = await response.json();
        setFormError(errorData.message || "Failed to delete category");
      }
    } catch (e) {
      setFormError("Failed to delete category: " + e.message);
    }
  };

  const openDeleteModal = (category: { id: string; name: string }) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
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
          const errorData = await response.json();
          setFetchError(errorData.message || "Failed to fetch categories");
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
                    <button
                      type="submit"
                      className="bg-primary-subtle border border-0"
                    >
                      <Image
                        src="/icons/plus-circle.svg"
                        alt="Add Category"
                        width={24}
                        height={24}
                        className="m-2"
                      />
                      Add Category
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="col-8">
              <Categories
                categories={categories}
                onCategoryClick={handleCategoryClick}
                fetchError={fetchError}
                onDeleteCategory={openDeleteModal}
              />
            </div>
          </div>
          <div className="row px-1">
            <CategoryItems
              selectedCategory={selectedCategory}
              items={items}
              itemError={itemError}
              fetchItems={fetchItems}
            />
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
    </SecureRoute>
  );
};

export default CategoryPage;
