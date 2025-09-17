import React, { useState } from "react";
import Image from "next/image";
import EditItemModal from "./item-edit";
import ItemDeleteModal from "./item-delete";
import { Category, Item } from "../../../../../types/types";
import { useApiCall } from "../../../../../utils/apiUtils";

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
}) => {
  const apiCall = useApiCall();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "grouped" | "individual">("all");
  const [subItemsData, setSubItemsData] = useState<Record<number, any>>({});
  const [loadingSubItems, setLoadingSubItems] = useState<Set<number>>(new Set());

  // Remove duplicates and filter items
  const allItems = pricelistItems || items;
  const uniqueItems = allItems.reduce((acc: Item[], current: Item) => {
    const existingItem = acc.find(item => item.id === current.id);
    if (!existingItem) {
      acc.push(current);
    }
    return acc;
  }, []);

  const filteredItems = uniqueItems.filter((item) => {
    const matchesSearch = !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "grouped") {
      return matchesSearch && Boolean(item.isGroup);
    } else if (activeTab === "individual") {
      return matchesSearch && !Boolean(item.isGroup);
    }

    return matchesSearch;
  });

  const handleEditItem = (item: Item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDeleteItemClick = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      handleDeleteItem?.(itemToDelete.id);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const fetchSubItems = async (itemId: number) => {
    if (subItemsData[itemId]) {
      return; // Already fetched
    }

    setLoadingSubItems(prev => new Set(prev).add(itemId));

    const result = await apiCall(`/api/menu/items/${itemId}/sub-items`);

    if (result.status === 200 && result.data?.success) {
      setSubItemsData(prev => ({
        ...prev,
        [itemId]: result.data.data
      }));
    } else {
      console.error("Failed to fetch sub-items:", result.error || "Unknown error");
    }

    setLoadingSubItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
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
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Search items by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    fontSize: '1.1rem',
                    padding: '0.75rem 1rem',
                    border: '2px solid #dee2e6',
                    borderRadius: '0.5rem',
                    transition: 'all 0.15s ease-in-out'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0d6efd';
                    e.target.style.boxShadow = '0 0 0 0.2rem rgba(13, 110, 253, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#dee2e6';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary btn-lg"
                    type="button"
                    onClick={() => setSearchTerm("")}
                    title="Clear search"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: '2px solid #6c757d'
                    }}
                  >
                    <i className="bi bi-x"></i>
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
                  Individual ({uniqueItems.filter(item => !Boolean(item.isGroup)).length})
                </button>
              </li>
            </ul>
          </div>
        )}

        <table className="table table-sm mt-3 table-striped">
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
                  <tr>
                    <td>
                      <div className="d-flex align-items-center">
                        {Boolean(item.isGroup) && (
                          <button
                            className="btn btn-outline-secondary btn-sm me-2"
                            onClick={() => toggleItemExpansion(item.id)}
                            style={{ fontSize: "0.9rem", minWidth: "30px" }}
                            title={expandedItems.has(item.id) ? "Collapse" : "Expand"}
                          >
                            <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                              {expandedItems.has(item.id) ? "−" : "+"}
                            </span>
                          </button>
                        )}
                        <span className={Boolean(item.isGroup) ? "fw-bold" : ""}>
                          {item.name}
                          {Boolean(item.isGroup) && <span className="badge bg-primary ms-2">Platter</span>}
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
                    <td>KSh {item.price}</td>
                    {isBillingSection && (
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onItemPick?.(item)}
                        >
                          Pick
                        </button>
                      </td>
                    )}
                  </tr>
                  {Boolean(item.isGroup) && expandedItems.has(item.id) && (
                    <tr>
                      <td colSpan={isBillingSection ? 3 : 5} className="bg-light">
                        <div className="p-2">
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
                              <div className="text-muted small mt-2">Loading platter contents...</div>
                            </div>
                          ) : subItemsData[item.id] ? (
                            <div>
                              {subItemsData[item.id].subItems.length > 0 ? (
                                <div className="table-responsive">
                                  <table className="table table-sm table-bordered mb-0">
                                    <thead className="table-light">
                                      <tr>
                                        <th style={{ fontSize: "0.8rem" }}>Item</th>
                                        <th style={{ fontSize: "0.8rem" }}>Code</th>
                                        <th style={{ fontSize: "0.8rem" }}>Category</th>
                                        <th style={{ fontSize: "0.8rem" }}>Portion</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {subItemsData[item.id].subItems.map((subItem: any) => (
                                        <tr key={subItem.id}>
                                          <td className="fw-medium" style={{ fontSize: "0.8rem" }}>{subItem.name}</td>
                                          <td style={{ fontSize: "0.8rem" }}><code>{subItem.code}</code></td>
                                          <td style={{ fontSize: "0.8rem" }}><span className="badge bg-secondary">{subItem.category}</span></td>
                                          <td style={{ fontSize: "0.8rem" }}>
                                            <span className="badge bg-primary">
                                              {subItem.portionSize} {subItem.unit}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="text-center py-3 text-muted">
                                  <i className="bi bi-inbox me-2"></i>
                                  No sub-items found for this platter.
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-3 text-muted">
                              <i className="bi bi-exclamation-triangle me-2"></i>
                              Failed to load platter contents. Please try again.
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
                <td colSpan={isBillingSection ? 3 : 5} className="text-center text-muted py-4">
                  {searchTerm ? "No items found matching your search." : "No items available."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

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