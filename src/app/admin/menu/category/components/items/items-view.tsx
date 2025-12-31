import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import EditItemModal from "./item-edit";
import ItemDeleteModal from "./item-delete";
import { Category, Item } from "../../../../../types/types";
import { useApiCall } from "../../../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../../../utils/errorUtils";
import styles from "./items-view.module.css";

interface ViewItemsProps {
  selectedCategory: Category | null;
  items: Item[];
  pricelistItems?: Item[];
  itemError: string;
  handleAddItemClick?: () => void;
  handleDeleteItem?: (itemId: number) => void;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  isBillingSection?: boolean;
  isPricelistSection?: boolean;
  isCategoryItemsSection?: boolean;
  onItemPick?: (item: Item) => void;
  highlightedItemId?: number | null;
  onHighlightClear?: () => void;
  itemInventory?: Record<number, number>;
  selectedItems?: Item[];
  onExpandedChange?: (hasExpanded: boolean) => void;
}

const ViewItems: React.FC<ViewItemsProps> = ({
  selectedCategory,
  items = [],
  pricelistItems,
  itemError,
  handleAddItemClick,
  handleDeleteItem,
  setItems,
  isBillingSection = false,
  isPricelistSection = false,
  isCategoryItemsSection = false,
  onItemPick,
  highlightedItemId,
  onHighlightClear,
  itemInventory = {},
  selectedItems = [],
  onExpandedChange,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "grouped" | "individual">("all");
  const [subItemsData, setSubItemsData] = useState<Record<number, any>>({});
  const [loadingSubItems, setLoadingSubItems] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [searchInputValue, setSearchInputValue] = useState<string>("");
  const [selectedSearchItem, setSelectedSearchItem] = useState<Item | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const apiCall = useApiCall();

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedItemId && onHighlightClear) {
      const timer = setTimeout(() => {
        onHighlightClear();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedItemId, onHighlightClear]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Remove duplicates and filter items - memoized to prevent recalculation on every render
  const allItems = pricelistItems || items;
  const uniqueItems = useMemo(() => {
    return allItems.reduce((acc: Item[], current: Item) => {
      const existingItem = acc.find(item => item.id === current.id);
      if (!existingItem) {
        acc.push(current);
      }
      return acc;
    }, []);
  }, [allItems]);

  // Filter items based on search (either searchTerm or selectedSearchItem) - memoized
  const filteredItems = useMemo(() => {
    return uniqueItems.filter((item) => {
      // If a specific item is selected from search dropdown, show only that item
      if (selectedSearchItem) {
        if (item.id !== selectedSearchItem.id) {
          return false;
        }
      } else if (searchTerm) {
        // Otherwise, use text search
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.code.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
      }

      if (activeTab === "grouped") {
        return item.isGroup === true;
      } else if (activeTab === "individual") {
        return item.isGroup !== true;
      }

      return true;
    });
  }, [uniqueItems, selectedSearchItem, searchTerm, activeTab]);

  // Filter items for search dropdown - memoized
  const searchableItems = useMemo(() => {
    return uniqueItems.filter((item) => {
      if (!searchInputValue || searchInputValue.length < 1) {
        return true; // Show all items when input is empty
      }
      const query = searchInputValue.toLowerCase();
      return item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query);
    }).slice(0, 10); // Limit to 10 items in dropdown
  }, [uniqueItems, searchInputValue]);

  const handleEditItem = useCallback((item: Item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  }, []);

  const handleDeleteItemClick = useCallback((item: Item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (itemToDelete) {
      handleDeleteItem?.(itemToDelete.id);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, handleDeleteItem]);

  const fetchSubItems = async (itemId: number) => {
    if (subItemsData[itemId]) {
      return; // Already fetched
    }

    setLoadingSubItems(prev => new Set(prev).add(itemId));

    try {
      const result = await apiCall(`/api/menu/items/${itemId}/sub-items`);

      if (result.status === 200 && result.data.success) {
        setSubItemsData(prev => ({
          ...prev,
          [itemId]: result.data.data
        }));
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch sub-items");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoadingSubItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const toggleItemExpansion = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
      // Fetch sub-items when expanding
      fetchSubItems(itemId);
    }
    setExpandedItems(newExpanded);

    // Notify parent if callback is provided (for billing section)
    if (onExpandedChange && isBillingSection) {
      onExpandedChange(newExpanded.size > 0);
    }
  };

  return (
    <div className="col mt-2">
      <div className="p-2 border bg-light">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <div className="d-flex align-items-center">
              <i className={`bi ${selectedCategory ? "bi-tag-fill" : "bi-tag"} me-2 text-primary`}></i>
              <span className="fw-bold text-dark">
                {selectedCategory
                  ? `${selectedCategory.name} Items`
                  : isPricelistSection
                    ? "Pricelist Items"
                    : "All Items"}
              </span>
              {!selectedCategory && !isPricelistSection && (
                <span className="badge bg-warning text-dark ms-2">Select a category</span>
              )}
            </div>
            <div className="text-muted small">
              {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} available
            </div>
          </div>
          <div className="row">
            <div className="col-8">
              <div className={`d-flex gap-2 ${styles.searchContainer}`} ref={searchRef}>
                <div className={styles.searchInputWrapper}>
                  <div
                    className={`form-control ${styles.searchInputContainer}`}
                    onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                  >
                    <input
                      type="text"
                      className={`border-0 ${styles.searchInput}`}
                      placeholder={selectedSearchItem ? selectedSearchItem.name : "Search items by name or code..."}
                      value={selectedSearchItem ? selectedSearchItem.name : searchInputValue}
                      onChange={(e) => {
                        setSearchInputValue(e.target.value);
                        setSelectedSearchItem(null);
                        setSearchTerm("");
                        setShowSearchDropdown(true);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSearchDropdown(true);
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        setShowSearchDropdown(true);
                      }}
                    />
                    <i className={`bi bi-chevron-${showSearchDropdown ? "up" : "down"} text-muted me-2`}></i>
                  </div>

                  {showSearchDropdown && (
                    <div className={`border rounded shadow-lg bg-white ${styles.searchDropdown}`}>
                      {searchableItems.length > 0 ? (
                        <>
                          <div
                            className={`px-3 py-2 border-bottom bg-light ${styles.clearFilterOption}`}
                            onClick={() => {
                              setSelectedSearchItem(null);
                              setSearchTerm("");
                              setSearchInputValue("");
                              setShowSearchDropdown(false);
                            }}
                          >
                            <i className="bi bi-x-circle me-2 text-muted"></i>
                            <span className="text-muted small">Clear filter (Show all items)</span>
                          </div>
                          {searchableItems.map((item) => (
                            <div
                              key={item.id}
                              className={`px-3 py-2 border-bottom ${selectedSearchItem?.id === item.id
                                ? styles.dropdownItemSelected
                                : styles.dropdownItem
                                }`}
                              onClick={() => {
                                setSelectedSearchItem(item);
                                setSearchInputValue(item.name);
                                setSearchTerm("");
                                setShowSearchDropdown(false);
                              }}
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <div className="fw-medium">{item.name}</div>
                                  {item.code && (
                                    <div className="text-muted small">
                                      <code>{item.code}</code>
                                    </div>
                                  )}
                                </div>
                                {item.isGroup === true && (
                                  <span className="badge bg-primary">Platter</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className={`px-3 py-3 text-center text-muted ${styles.dropdownEmpty}`}>
                          <i className="bi bi-search me-2"></i>
                          No items found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {(selectedSearchItem || searchTerm) && (
                  <button
                    className={`btn btn-outline-danger ${styles.clearButton}`}
                    type="button"
                    onClick={() => {
                      setSelectedSearchItem(null);
                      setSearchTerm("");
                      setSearchInputValue("");
                      setShowSearchDropdown(false);
                    }}
                    title="Clear search"
                  >
                    <i className="bi bi-x-lg fs-5"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Item Button - Only for category sections, not pricelist */}
        {!isBillingSection && selectedCategory && !isPricelistSection && (
          <div className="mb-3">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddItemClick}
            >
              <i className="bi bi-plus-circle me-1"></i>
              Add Item
            </button>
          </div>
        )}
        {itemError && <p style={{ color: "red" }}>{itemError}</p>}

        {/* Tabs for grouped vs individual items - Only for pricelist sections */}
        {isPricelistSection && (
          <div className="mb-3">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  All Items ({uniqueItems.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "grouped" ? "active" : ""}`}
                  onClick={() => setActiveTab("grouped")}
                >
                  Platters ({uniqueItems.filter(item => Boolean(item.isGroup)).length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "individual" ? "active" : ""}`}
                  onClick={() => setActiveTab("individual")}
                >
                  Individual ({uniqueItems.filter(item => !item.isGroup).length})
                </button>
              </li>
            </ul>
          </div>
        )}

        <div className={`table-responsive ${isBillingSection ? styles.tableContainerBilling : styles.tableContainer}`}>
          <table className={`table table-sm mt-3 table-striped ${styles.itemsTable}`}>
            <thead>
              <tr>
                <th scope="col">Item name</th>
                {!isBillingSection && (
                  <>
                    <th>Item code</th>
                    <th>Category</th>
                  </>
                )}
                <th>Pricelist</th>
                <th>Item price</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr
                      className={highlightedItemId === item.id ? `table-warning ${styles.highlightedRow}` : ""}
                    >
                      <td>
                        <div className="d-flex align-items-center">
                          {item.isGroup === true && (
                            <button
                              className={`btn btn-outline-secondary btn-sm me-2 ${styles.expandButton}`}
                              onClick={() => toggleItemExpansion(item.id)}
                              title={expandedItems.has(item.id) ? "Collapse" : "Expand"}
                            >
                              <span className={styles.expandButtonIcon}>
                                {expandedItems.has(item.id) ? "−" : "+"}
                              </span>
                            </button>
                          )}
                          <span className={item.isGroup === true ? "fw-bold" : ""}>
                            {item.name}
                            {item.isGroup === true && <span className="badge bg-primary ms-2">Platter</span>}
                          </span>
                        </div>
                      </td>
                      {!isBillingSection && (
                        <>
                          <td>{item.code}</td>
                          <td>{item.category?.name || "N/A"}</td>
                        </>
                      )}
                      <td>{item.pricelistName || "N/A"}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span>KSh {item.price}</span>
                          {isBillingSection && itemInventory && Object.prototype.hasOwnProperty.call(itemInventory, item.id) && (
                            <span
                              className={`badge ${(itemInventory[item.id] || 0) > 0
                                ? "bg-success"
                                : "bg-danger"
                                }`}
                              title={`Available: ${itemInventory[item.id] || 0} units`}
                            >
                              {itemInventory[item.id] || 0} available
                            </span>
                          )}
                        </div>
                      </td>
                      {isBillingSection && (
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onItemPick?.(item)}
                            disabled={
                              itemInventory &&
                              Object.prototype.hasOwnProperty.call(itemInventory, item.id) &&
                              (itemInventory[item.id] || 0) === 0
                            }
                            title={
                              itemInventory &&
                                Object.prototype.hasOwnProperty.call(itemInventory, item.id) &&
                                (itemInventory[item.id] || 0) === 0
                                ? "No inventory available"
                                : "Add to bill"
                            }
                          >
                            Pick
                          </button>
                        </td>
                      )}
                    </tr>
                    {item.isGroup === true && expandedItems.has(item.id) && (
                      <tr>
                        <td colSpan={isBillingSection ? 4 : 5} className={`bg-light p-0 ${styles.expandedRow}`}>
                          <div className={`p-2 ${isBillingSection ? styles.expandedContentBilling : styles.expandedContent}`}>
                            <div className="d-flex align-items-center mb-2">
                              {loadingSubItems.has(item.id) && (
                                <div className="spinner-border spinner-border-sm me-2" role="status">
                                  <span className="visually-hidden">Loading...</span>
                                </div>
                              )}
                            </div>

                            {loadingSubItems.has(item.id) ? (
                              <div className="text-center py-3">
                                <div className="spinner-border text-primary" role="status">
                                  <span className="visually-hidden">Loading sub-items...</span>
                                </div>
                                <div className="text-muted small mt-2">Loading recipe ingredients...</div>
                              </div>
                            ) : subItemsData[item.id] ? (
                              <div className={isBillingSection ? styles.expandedContentBilling : styles.expandedContent}>
                                {subItemsData[item.id].subItems.length > 0 ? (
                                  <div className={styles.expandedContentInner}>
                                    {isBillingSection ? (
                                      // Simplified layout for billing section - just show ingredient and portion
                                      <div className="d-flex flex-column gap-2">
                                        {subItemsData[item.id].subItems.map((subItem: any) => (
                                          <div key={subItem.id} className={styles.ingredientCard}>
                                            <span className="fw-medium">{subItem.name}</span>
                                            <span className="badge bg-primary">
                                              {subItem.portionSize} {subItem.unit || "servings"}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      // Full table for non-billing sections
                                      <table className={`table table-sm table-bordered mb-0 ${styles.ingredientTable}`}>
                                        <thead className="table-light">
                                          <tr>
                                            <th className={styles.ingredientTableHeader}>Ingredient</th>
                                            <th className={styles.ingredientTableHeader}>Code</th>
                                            <th className={styles.ingredientTableHeader}>Category</th>
                                            <th className={styles.ingredientTableHeader}>Portion Size</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {subItemsData[item.id].subItems.map((subItem: any) => (
                                            <tr key={subItem.id}>
                                              <td className={`fw-medium ${styles.ingredientTableCell}`}>{subItem.name}</td>
                                              <td className={styles.ingredientTableCell}><code>{subItem.code}</code></td>
                                              <td className={styles.ingredientTableCell}><span className="badge bg-secondary">{subItem.category}</span></td>
                                              <td className={styles.ingredientTableCell}>
                                                <span className="badge bg-primary">
                                                  {subItem.portionSize} {subItem.unit || "servings"}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-3 text-muted">
                                    <i className="bi bi-inbox me-2"></i>
                                    No ingredients found for this composite item.
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-3 text-muted">
                                <i className="bi bi-exclamation-triangle me-2"></i>
                                Failed to load recipe ingredients. Please try again.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={isBillingSection ? 4 : 5} className="text-center text-muted py-4">
                    {searchTerm ? "No items found matching your search." : "No items available."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modals */}
        {showEditModal && selectedItem && (
          <EditItemModal
            show={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={(editedItem) => {
              setItems(prevItems =>
                prevItems.map(item =>
                  item.id === editedItem.id ? editedItem : item
                )
              );
              setShowEditModal(false);
            }}
            item={selectedItem}
          />
        )}

        {showDeleteModal && itemToDelete && (
          <ItemDeleteModal
            show={showDeleteModal}
            onCancel={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteConfirm}
            itemName={itemToDelete.name}
          />
        )}
      </div>
    </div>
  );
};

export default ViewItems;