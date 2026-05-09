"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Button } from "react-bootstrap";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import AddSubItemModal from "./new";
import ErrorDisplay from "src/app/components/ErrorDisplay";
import PageHeaderStrip from "src/app/components/PageHeaderStrip";
import HelpPopover from "src/app/components/HelpPopover";
import { useApiCall } from "src/app/utils/apiUtils";
import { ApiErrorResponse } from "src/app/utils/errorUtils";
import { useTooltips } from "../../../hooks/useTooltips";

function RecipesPage() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [subItems, setSubItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const apiCall = useApiCall();
  const [addSubItemError, setAddSubItemError] = useState<string | null>(null);
  const [editingPortionSize, setEditingPortionSize] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [updatingPortionSize, setUpdatingPortionSize] = useState(false);
  useTooltips();

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    setFilteredItems(
      items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [searchTerm, items]);

  const fetchItems = async () => {
    try {
      // Fetch only composite items for recipes
      const result = await apiCall("/api/production?compositeOnly=true");
      if (result.status === 200) {
        const itemsArray = Array.isArray(result.data) ? result.data : [];
        setItems(itemsArray);
        setFilteredItems(itemsArray);
        setFetchError(null);
      } else if (result.status === 403) {
        // Handle permission errors with detailed information
        const errorData = result.errorDetails || {};
        const errorMessage = result.error || "Access denied";
        const missingPermissions = errorData.missingPermissions || [];
        const userRoles = errorData.userRoles || [];
        const isAdmin = errorData.isAdmin || false;

        let detailedError = `${errorMessage}`;
        if (missingPermissions.length > 0) {
          detailedError += `\n\nMissing permissions: ${missingPermissions.join(", ")}`;
        }
        if (userRoles.length > 0) {
          detailedError += `\n\nYour roles: ${userRoles.join(", ")}`;
        }
        if (!isAdmin) {
          detailedError += "\n\nNote: You need admin privileges to access recipes.";
        }

        setFetchError(detailedError);
        setErrorDetails(result.errorDetails);
        setItems([]);
        setFilteredItems([]);
      } else {
        setFetchError(result.error || "Failed to fetch items");
        setErrorDetails(result.errorDetails);
        setItems([]);
        setFilteredItems([]);
      }
    } catch (error: any) {
      console.error("Error fetching items:", error);
      setFetchError("Network error occurred while fetching items");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setItems([]);
      setFilteredItems([]);
    }
  };

  const handleItemSelect = async (itemId) => {
    const itemData = items.find((item) => item.id === itemId);

    if (itemData) {
      setSelectedItem(itemId);
      setSelectedItemName(itemData.name);
      await fetchSubItemsFromBackend(itemId);
    }
  };

  const addSubItemToItem = async (subItemId, portionSize) => {
    if (!selectedItem) {
      setAddSubItemError("No item selected");
      return;
    }
    try {
      setAddSubItemError(null);
      const result = await apiCall(`/api/production/${selectedItem}/sub-items`, {
        method: "POST",
        body: JSON.stringify({
          subItemId: subItemId,
          portionSize: portionSize,
        }),
      });

      if (result.status === 200) {
        await fetchSubItemsFromBackend(selectedItem);
        closeModal();
      } else if (result.status === 403) {
        // Handle permission errors with detailed information
        const errorData = result.errorDetails || {};
        const errorMessage = result.error || "Access denied";
        const missingPermissions = errorData.missingPermissions || [];
        const userRoles = errorData.userRoles || [];

        let detailedError = `${errorMessage}`;
        if (missingPermissions.length > 0) {
          detailedError += `\n\nMissing permissions: ${missingPermissions.join(", ")}`;
        }
        if (userRoles.length > 0) {
          detailedError += `\n\nYour roles: ${userRoles.join(", ")}`;
        }

        setAddSubItemError(detailedError);
        setErrorDetails(result.errorDetails);
      } else {
        setAddSubItemError(result.error || "Failed to add ingredient");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error adding ingredient:", error);
      setAddSubItemError("Network error occurred while adding ingredient");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const fetchSubItemsFromBackend = async (itemId) => {
    try {
      const result = await apiCall(`/api/production/${itemId}/sub-items`);
      if (result.status === 200) {
        const items = result.data?.[0]?.subItems || [];
        setSubItems(items);
        updateItemsInState(itemId, items);
      } else {
        console.error("Failed to fetch ingredients:", result.error);
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error fetching ingredients:", error);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const updateItemsInState = (itemId, updatedItems) => {
    const updatedItemsList = items.map((item) => {
      if (item.id === itemId) {
        return { ...item, subItems: updatedItems };
      }
      return item;
    });
    setItems(updatedItemsList);
    setFilteredItems(updatedItemsList);
  };

  const confirmRemoveItem = (subItemId) => {
    setItemToRemove(subItemId);
    setShowConfirmation(true);
  };

  const handleConfirmRemove = async () => {
    setShowConfirmation(false);
    if (itemToRemove !== null) {
      await removeSubItemFromItem(itemToRemove);
      setItemToRemove(null);
    }
  };

  const removeSubItemFromItem = async (subItemId) => {
    try {
      const result = await apiCall(`/api/production/${selectedItem}/sub-items/${subItemId}`, {
        method: "DELETE",
      });
      if (result.status === 200) {
        await fetchSubItemsFromBackend(selectedItem);
      } else {
        console.error("Failed to remove ingredient:", result.error);
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error removing ingredient:", error);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const startEditingPortionSize = (subItemId: number, currentPortionSize: number) => {
    setEditingPortionSize(subItemId);
    setEditingValue(currentPortionSize.toString());
  };

  const cancelEditingPortionSize = () => {
    setEditingPortionSize(null);
    setEditingValue("");
  };

  const updatePortionSize = async (subItemId: number) => {
    if (!selectedItem || !editingValue || isNaN(Number(editingValue)) || Number(editingValue) <= 0) {
      setErrorDetails({ message: "Please enter a valid portion size greater than 0", status: 400 });
      return;
    }

    setUpdatingPortionSize(true);
    try {
      const result = await apiCall(`/api/production/${selectedItem}/sub-items/${subItemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          portionSize: Number(editingValue),
        }),
      });

      if (result.status === 200) {
        await fetchSubItemsFromBackend(selectedItem);
        setEditingPortionSize(null);
        setEditingValue("");
        setErrorDetails(null);
      } else {
        setErrorDetails(result.errorDetails || { message: result.error || "Failed to update portion size", status: result.status || 500 });
      }
    } catch (error: any) {
      console.error("Error updating portion size:", error);
      setErrorDetails({ message: "Network error occurred while updating portion size", networkError: true, status: 0 });
    } finally {
      setUpdatingPortionSize(false);
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold d-flex align-items-center flex-wrap gap-2">
            <span>
              <i className="bi bi-journal-text me-2" aria-hidden></i>
              Recipes
            </span>
            <HelpPopover id="recipes-page-about-admin" title="About recipes" wide className="text-white">
              <p className="mb-2">
                <strong>Recipes</strong> control how much of each stock ingredient is deducted when a <strong>composite</strong> menu item is sold.
              </p>
              <p className="mb-2">
                <strong>Composite items</strong> (left) list ingredient ratios. <strong>Portion size</strong> is the amount deducted per{" "}
                <em>one unit</em> of the composite sold.
              </p>
              <p className="mb-2">
                <strong>Example:</strong> Breakfast Combo with Eggs portion 2 → selling 5 combos deducts 10 eggs.
              </p>
              <p className="mb-0">
                <strong>Note:</strong> Simple items without a recipe often default to 1:1 stock deduction where applicable.
              </p>
            </HelpPopover>
          </h1>
        </PageHeaderStrip>


        {/* Error Display */}
        {fetchError && (
          <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
            <div className="d-flex align-items-start">
              <i className="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
              <div className="flex-grow-1">
                <strong>Access Error</strong>
                <div className="mt-2">
                  {fetchError.split("\n").map((line, index) => (
                    <div key={index} className={line.includes("Missing permissions:") || line.includes("Your roles:") || line.includes("Note:") ? "small text-muted" : ""}>
                      {line}
                    </div>
                  ))}
                </div>
                {fetchError.includes("Missing permissions:") && (
                  <div className="mt-3">
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      Contact your administrator to add the required permissions to your role.
                    </small>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setFetchError(null)}
                aria-label="Close"
              ></button>
            </div>
          </div>
        )}
        {addSubItemError && (
          <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
            <div className="d-flex align-items-start">
              <i className="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
              <div className="flex-grow-1">
                <strong>Add Ingredient Error</strong>
                <div className="mt-2">
                  {addSubItemError.split("\n").map((line, index) => (
                    <div key={index} className={line.includes("Missing permissions:") || line.includes("Your roles:") ? "small text-muted" : ""}>
                      {line}
                    </div>
                  ))}
                </div>
                {addSubItemError.includes("Missing permissions:") && (
                  <div className="mt-3">
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      Contact your administrator to add the required permissions to your role.
                    </small>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setAddSubItemError(null)}
                aria-label="Close"
              ></button>
            </div>
          </div>
        )}

        <ErrorDisplay
          error={errorDetails?.message || null}
          errorDetails={errorDetails}
          onDismiss={() => {
            setErrorDetails(null);
          }}
        />

        {/* Main Content */}
        <div className="row g-2">
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0 fw-bold d-flex align-items-center flex-wrap gap-1">
                  <span>
                    <i className="bi bi-box-seam me-2 text-primary"></i>
                    Composite Items
                  </span>
                  <HelpPopover id="recipes-composite-admin" title="Composite items">
                    Menu items that have a recipe (ingredient list). Select one to view or edit ingredients and portion sizes on the right.
                  </HelpPopover>
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search Items"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div
                  className="list-group"
                  style={{ maxHeight: "400px", overflowY: "auto" }}
                >
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <li
                        key={item.id}
                        className="list-group-item list-group-item-action"
                        onClick={() => handleItemSelect(item.id)}
                        style={{ cursor: "pointer" }}
                      >
                        {item.name}
                      </li>
                    ))
                  ) : (
                    <li className="list-group-item">No composite items found</li>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold d-flex align-items-center flex-wrap gap-1">
                    <span>
                      <i className="bi bi-list-ul me-2 text-primary"></i>
                      Ingredients for {selectedItem ? selectedItemName : "Selected Item"}
                    </span>
                    <HelpPopover id="recipes-ingredients-admin" title="Ingredients" wide>
                      <p className="mb-2">
                        <strong>Stock</strong> items deducted from inventory when this composite item is sold. Only eligible stock lines can be added—use{" "}
                        <strong>Add Ingredient</strong>.
                      </p>
                      <p className="mb-0">If this list is empty, add ingredients that will be consumed per sale (see portion size column).</p>
                    </HelpPopover>
                  </h5>
                  {selectedItem && (
                    <button className="btn btn-success btn-sm" onClick={openModal}>
                      <i className="bi bi-plus-circle me-1"></i>
                      Add Ingredient
                    </button>
                  )}
                </div>
              </div>
              <div className="card-body">
                {selectedItem ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th className="fw-semibold">Ingredient</th>
                          <th className="fw-semibold">
                            <span className="d-inline-flex align-items-center gap-1">
                              Portion Size
                              <HelpPopover id="recipes-portion-admin" title="Portion size">
                                Amount of this ingredient deducted per <strong>one unit</strong> of the composite item sold (e.g. 2 eggs per combo).
                              </HelpPopover>
                            </span>
                          </th>
                          <th className="fw-semibold text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subItems.length > 0 ? (
                          subItems.map((subItem) => (
                            <tr key={subItem.id}>
                              <td>{subItem.name}</td>
                              <td>
                                {editingPortionSize === subItem.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="form-control form-control-sm"
                                    style={{ width: "100px" }}
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        updatePortionSize(subItem.id);
                                      } else if (e.key === "Escape") {
                                        cancelEditingPortionSize();
                                      }
                                    }}
                                    autoFocus
                                    disabled={updatingPortionSize}
                                  />
                                ) : (
                                  <span>{subItem.portionSize}</span>
                                )}
                              </td>
                              <td className="text-center">
                                <div className="d-flex gap-1 justify-content-center">
                                  {editingPortionSize === subItem.id ? (
                                    <>
                                      <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => updatePortionSize(subItem.id)}
                                        disabled={updatingPortionSize}
                                        title="Save"
                                      >
                                        <i className="bi bi-check"></i>
                                      </button>
                                      <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={cancelEditingPortionSize}
                                        disabled={updatingPortionSize}
                                        title="Cancel"
                                      >
                                        <i className="bi bi-x"></i>
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => startEditingPortionSize(subItem.id, subItem.portionSize)}
                                        title="Edit portion size"
                                      >
                                        <i className="bi bi-pencil"></i>
                                      </button>
                                      <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => confirmRemoveItem(subItem.id)}
                                        title="Remove ingredient"
                                      >
                                        <i className="bi bi-trash"></i>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center py-4">
                              <i className="bi bi-inbox text-muted" style={{ fontSize: "2rem" }}></i>
                              <p className="text-muted mt-2 mb-0">No ingredients defined yet.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-cursor text-muted" style={{ fontSize: "3rem" }}></i>
                    <p className="text-muted mt-3 mb-0">Select a composite item on the left to view or edit its recipe.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddSubItemModal
        isModalOpen={isModalOpen}
        closeModal={closeModal}
        addSubItemToItem={addSubItemToItem}
        addSubItemError={addSubItemError}
        setAddSubItemError={setAddSubItemError}
        selectedGroupItemId={selectedItem}
      />

      <Modal show={showConfirmation} onHide={() => setShowConfirmation(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Action</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove this ingredient from the recipe?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmation(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmRemove}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </RoleAwareLayout>
  );
}

export default RecipesPage;

