"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import CategoryItems from "./components/category/category-items";
import CategoryDeleteModal from "./components/category/category-delete";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { useApiCall } from "../../../utils/apiUtils";
import { useTooltips } from "../../../hooks/useTooltips";

interface Category {
  id: string;
  name: string;
  code?: string;
  status?: string;
}

const CategoryPage: React.FC = () => {
  const apiCall = useApiCall();
  useTooltips();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [items, setItems] = useState([]);
  const [itemError, setItemError] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  /* ── Add modal ─────────────────────────────────────────────── */
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  /* ── Edit modal ─────────────────────────────────────────────── */
  const [showEditModal, setShowEditModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  /* ── Delete modal ───────────────────────────────────────────── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  /* ── Fetch categories ───────────────────────────────────────── */
  useEffect(() => {
    apiCall("/api/menu/categories").then((result) => {
      if (result.status >= 200 && result.status < 300) {
        setCategories(Array.isArray(result.data) ? result.data : []);
      } else {
        setFetchError(result.error || "Failed to fetch categories");
      }
    });
  }, []);

  const filteredCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.code ?? "").toLowerCase().includes(q)
    );
  }, [categories, searchTerm]);

  /* ── Fetch items for a category ─────────────────────────────── */
  const fetchItems = useCallback(async (categoryId: string, forceRefresh = false) => {
    const url = `/api/menu/items?category=${categoryId}${forceRefresh ? `&t=${Date.now()}` : ""}`;
    const result = await apiCall(url);
    if (result.status >= 200 && result.status < 300) {
      setItems(Array.isArray(result.data) ? result.data : []);
      setItemError("");
    } else {
      setItemError("Failed to fetch items: " + (result.error || "Unknown error"));
    }
  }, [apiCall]);

  const handleCategoryClick = (cat: Category) => {
    setSelectedCategory(cat);
    fetchItems(cat.id, true);
  };

  /* ── Add category ───────────────────────────────────────────── */
  const handleAdd = async () => {
    if (!addName.trim()) { setAddError("Name is required"); return; }
    setAddLoading(true);
    setAddError(null);
    const result = await apiCall("/api/menu/categories", {
      method: "POST",
      body: JSON.stringify({ name: addName.trim(), code: addCode.trim().toUpperCase() || undefined }),
    });
    setAddLoading(false);
    if (result.status >= 200 && result.status < 300) {
      setCategories((prev) => [...prev, result.data]);
      setAddName("");
      setAddCode("");
      setShowAddModal(false);
    } else {
      setAddError(result.error || "Failed to create category");
    }
  };

  /* ── Edit category ──────────────────────────────────────────── */
  const openEditModal = (cat: Category) => {
    setCategoryToEdit(cat);
    setEditName(cat.name);
    setEditCode(cat.code ?? "");
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!categoryToEdit) return;
    if (!editName.trim()) { setEditError("Name is required"); return; }
    setEditLoading(true);
    setEditError(null);
    const result = await apiCall(`/api/menu/categories/${categoryToEdit.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: editName.trim(), code: editCode.trim().toUpperCase() || null }),
    });
    setEditLoading(false);
    if (result.status >= 200 && result.status < 300) {
      const updated = { ...categoryToEdit, name: editName.trim(), code: editCode.trim().toUpperCase() || undefined };
      setCategories((prev) => prev.map((c) => (c.id === categoryToEdit.id ? updated : c)));
      if (selectedCategory?.id === categoryToEdit.id) setSelectedCategory(updated);
      setShowEditModal(false);
      setCategoryToEdit(null);
    } else {
      setEditError(result.error || "Failed to update category");
    }
  };

  /* ── Delete category ────────────────────────────────────────── */
  const handleDelete = async (categoryId: string) => {
    const result = await apiCall(`/api/menu/categories/${categoryId}`, { method: "DELETE" });
    if (result.status >= 200 && result.status < 300) {
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(null);
        setItems([]);
      }
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    } else {
      setFetchError(result.error || "Failed to delete category");
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-grid me-2" aria-hidden></i>
            Menu Management
          </h1>
        </PageHeaderStrip>

        <ErrorDisplay error={fetchError} onDismiss={() => setFetchError(null)} />

        <div className="row g-2">
          {/* ── Left: category list ─────────────────────────── */}
          <div className="col-12 col-lg-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-grid me-2 text-primary"></i>
                    Categories
                  </h5>
                  <Button variant="primary" size="sm" onClick={() => { setAddError(null); setAddName(""); setAddCode(""); setShowAddModal(true); }}>
                    <i className="bi bi-plus-circle me-1"></i>
                    Add Category
                  </Button>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="p-3 border-bottom">
                  <Form.Control
                    type="text"
                    size="sm"
                    placeholder="Search categories…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {filteredCategories.length === 0 ? (
                    <p className="text-muted text-center py-4 small">
                      {categories.length === 0 ? "No categories yet." : "No matches."}
                    </p>
                  ) : (
                    <table className="table table-hover mb-0">
                      <thead className="table-light sticky-top" style={{ top: 0 }}>
                        <tr>
                          <th className="fw-semibold" style={{ width: "2rem" }}>#</th>
                          <th className="fw-semibold">Name</th>
                          <th className="fw-semibold">Code</th>
                          <th className="fw-semibold text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCategories.map((cat, i) => (
                          <tr
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat)}
                            style={{ cursor: "pointer" }}
                            className={selectedCategory?.id === cat.id ? "table-primary" : ""}
                          >
                            <td className="fw-medium">{i + 1}</td>
                            <td>{cat.name}</td>
                            <td>
                              {cat.code
                                ? <span className="badge bg-secondary">{cat.code}</span>
                                : <span className="text-muted small">—</span>}
                            </td>
                            <td className="text-center">
                              <div className="d-flex gap-1 justify-content-center">
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  title="Edit"
                                  onClick={(e) => { e.stopPropagation(); openEditModal(cat); }}
                                >
                                  <i className="bi bi-pencil"></i>
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  title="Delete"
                                  onClick={(e) => { e.stopPropagation(); setCategoryToDelete(cat); setShowDeleteModal(true); }}
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: items in selected category ──────────────── */}
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-box-seam me-2 text-primary"></i>
                  {selectedCategory ? (
                    <>
                      <span className="fw-normal text-muted me-2">Category:</span>
                      {selectedCategory.name}
                    </>
                  ) : "Items"}
                </h5>
              </div>
              <div className="card-body">
                {selectedCategory ? (
                  <CategoryItems
                    selectedCategory={selectedCategory}
                    items={items}
                    itemError={itemError}
                    fetchItems={(id) => fetchItems(id, true)}
                  />
                ) : (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-arrow-left-circle" style={{ fontSize: "2.5rem" }}></i>
                    <p className="mt-2 mb-0">Select a category from the list to view its items</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Category modal ───────────────────────────────── */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-plus-circle me-2 text-primary"></i>Add Category
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {addError && <div className="alert alert-danger py-2 small">{addError}</div>}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Category Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter category name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label className="fw-semibold">
              Code <span className="text-muted fw-normal small">(optional, used in CSV uploads)</span>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. BRK"
              value={addCode}
              onChange={(e) => setAddCode(e.target.value.toUpperCase())}
              maxLength={20}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={addLoading}>Cancel</Button>
          <Button variant="success" onClick={handleAdd} disabled={addLoading}>
            {addLoading ? <><Spinner size="sm" className="me-1" />Saving…</> : <><i className="bi bi-plus-circle me-1"></i>Add Category</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Edit Category modal ──────────────────────────────── */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2 text-primary"></i>Edit Category
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editError && <div className="alert alert-danger py-2 small">{editError}</div>}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Category Name</Form.Label>
            <Form.Control
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label className="fw-semibold">
              Code <span className="text-muted fw-normal small">(optional)</span>
            </Form.Label>
            <Form.Control
              type="text"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value.toUpperCase())}
              maxLength={20}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={editLoading}>Cancel</Button>
          <Button variant="primary" onClick={handleEdit} disabled={editLoading}>
            {editLoading ? <><Spinner size="sm" className="me-1" />Saving…</> : <><i className="bi bi-check-circle me-1"></i>Save Changes</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Delete Category modal ────────────────────────────── */}
      {categoryToDelete && (
        <CategoryDeleteModal
          show={showDeleteModal}
          categoryName={categoryToDelete.name}
          onConfirm={() => handleDelete(categoryToDelete.id)}
          onCancel={() => { setShowDeleteModal(false); setCategoryToDelete(null); }}
        />
      )}
    </RoleAwareLayout>
  );
};

export default CategoryPage;
