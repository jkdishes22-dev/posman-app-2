"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import AddGroupItemModal from "./add-group-item";
import { Modal, Button, Badge, Spinner, Table, Alert } from "react-bootstrap";
import { useApiCall } from "../../../../../../utils/apiUtils";
import { Group, GroupItem, GroupedItemsResponse } from "../../../../../../types/types";
import { ApiErrorResponse } from "../../../../../../utils/errorUtils";
import ErrorDisplay from "../../../../../../components/ErrorDisplay";

function GroupedItemsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [groupItems, setGroupItems] = useState<GroupItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  // Pagination and infinite scroll states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalGroups: 0,
    hasNext: false,
    hasPrev: false,
    limit: 10
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const apiCall = useApiCall();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    setFilteredGroups(
      groups.filter((group: Group) =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [searchTerm, groups]);

  // Infinite scroll setup
  useEffect(() => {
    if (loadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreGroups();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadingMore, hasMore]);

  const fetchGroups = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const result = await apiCall(`/api/menu/items/groups?page=${page}&limit=10`);

      if (result.status === 200) {
        const data: GroupedItemsResponse = result.data;

        if (append) {
          setGroups(prev => [...prev, ...data.groups]);
        } else {
          setGroups(data.groups);
        }

        setPagination(data.pagination);
        setHasMore(data.pagination.hasNext);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch groups");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreGroups = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchGroups(nextPage, true);
    }
  }, [currentPage, loadingMore, hasMore]);

  const fetchGroupItemsFromBackend = async (groupId: number) => {
    try {
      const result = await apiCall(`/api/menu/items/groups?groupId=${groupId}`);
      if (result.status === 200) {
        setGroupItems(result.data[0]?.items || []);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch group items");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleGroupClick = (group: Group) => {
    setSelectedGroup(group);
    setSelectedGroupName(group.name);
    setGroupItems(group.items);
  };

  const handleAddItem = async (itemData: any) => {
    try {
      const result = await apiCall("/api/menu/items/groups", {
        method: "POST",
        body: JSON.stringify({
          itemId: selectedGroup?.id,
          subItemId: itemData.subItemId,
          portionSize: itemData.portionSize,
        }),
      });

      if (result.status === 200 || result.status === 201) {
        await fetchGroupItemsFromBackend(selectedGroup!.id);
        // Update the groups list to reflect the change
        setGroups(prev => prev.map(group =>
          group.id === selectedGroup!.id
            ? { ...group, items: groupItems }
            : group
        ));
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to add item to group");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleRemoveItem = (itemId: number) => {
    setItemToRemove(itemId);
    setShowConfirmation(true);
  };

  const confirmRemoveItem = async () => {
    if (itemToRemove && selectedGroup) {
      try {
        const result = await apiCall(`/api/menu/items/groups/${itemToRemove}`, {
          method: "DELETE",
        });

        if (result.status === 200) {
          await fetchGroupItemsFromBackend(selectedGroup.id);
          // Update the groups list to reflect the change
          setGroups(prev => prev.map(group =>
            group.id === selectedGroup.id
              ? { ...group, items: groupItems.filter(item => item.id !== itemToRemove) }
              : group
          ));
          setError(null);
          setErrorDetails(null);
        } else {
          setError(result.error || "Failed to remove item from group");
          setErrorDetails(result.errorDetails);
        }
      } catch (error: any) {
        setError("Network error occurred");
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      }
    }
    setShowConfirmation(false);
    setItemToRemove(null);
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="mb-0">
                <i className="bi bi-collection me-2"></i>
                Grouped Items Management
              </h2>
              <div className="text-muted">
                {pagination.totalGroups} groups total
              </div>
            </div>

            <ErrorDisplay
              error={error}
              errorDetails={errorDetails}
              onDismiss={() => {
                setError(null);
                setErrorDetails(null);
              }}
            />

            <div className="row">
              {/* Left Column - Groups List */}
              <div className="col-md-4">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-list-ul me-2"></i>
                      Available Groups
                    </h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="p-3 border-bottom">
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-search"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search groups..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ height: "400px", overflowY: "auto" }}>
                      {loading ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" variant="primary" />
                          <div className="mt-2 text-muted">Loading groups...</div>
                        </div>
                      ) : filteredGroups.length === 0 ? (
                        <div className="text-center py-4">
                          <i className="bi bi-inbox fs-1 text-muted"></i>
                          <h6 className="mt-3 text-muted">No groups found</h6>
                          <p className="text-muted small">
                            {searchTerm ? "Try adjusting your search terms" : "No grouped items have been created yet"}
                          </p>
                        </div>
                      ) : (
                        <div className="list-group list-group-flush">
                          {filteredGroups.map((group: Group) => (
                            <div
                              key={group.id}
                              className={`list-group-item list-group-item-action ${selectedGroup?.id === group.id ? "active" : ""
                                }`}
                              onClick={() => handleGroupClick(group)}
                              style={{ cursor: "pointer" }}
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <h6 className="mb-1 fw-bold">{group.name}</h6>
                                  <small className="text-muted">
                                    {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                                  </small>
                                </div>
                                <Badge
                                  bg={selectedGroup?.id === group.id ? "light" : "secondary"}
                                  text={selectedGroup?.id === group.id ? "dark" : "white"}
                                >
                                  {group.items.length}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Load More Trigger */}
                      {hasMore && !loading && (
                        <div ref={loadMoreRef} className="text-center py-3">
                          {loadingMore ? (
                            <div>
                              <Spinner animation="border" size="sm" variant="primary" />
                              <div className="mt-2 text-muted small">Loading more groups...</div>
                            </div>
                          ) : (
                            <div className="text-muted small">
                              Scroll down to load more groups
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Group Items Management */}
              <div className="col-md-8">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-gear me-2"></i>
                      {selectedGroup ? `Manage "${selectedGroupName}"` : "Select a Group"}
                    </h5>
                  </div>
                  <div className="card-body" style={{ height: "400px", overflowY: "auto" }}>
                    {!selectedGroup ? (
                      <div className="text-center py-5">
                        <i className="bi bi-arrow-left-circle fs-1 text-muted"></i>
                        <h6 className="mt-3 text-muted">Select a group to manage</h6>
                        <p className="text-muted small">Choose a group from the list to add or remove items</p>
                      </div>
                    ) : (
                      <>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="mb-1">Items in this group ({groupItems.length})</h6>
                            <small className="text-muted">Add or remove items as needed</small>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsModalOpen(true)}
                          >
                            <i className="bi bi-plus-circle me-1"></i>
                            Add Item
                          </Button>
                        </div>

                        {groupItems.length === 0 ? (
                          <div className="text-center py-4">
                            <i className="bi bi-inbox fs-1 text-muted"></i>
                            <h6 className="mt-3 text-muted">No items in this group</h6>
                            <p className="text-muted small">Click "Add Item" to get started</p>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-hover">
                              <thead className="table-light">
                                <tr>
                                  <th>Item Name</th>
                                  <th>Portion Size</th>
                                  <th style={{ width: "100px" }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupItems.map((item: GroupItem) => (
                                  <tr key={item.id}>
                                    <td className="fw-medium">{item.name}</td>
                                    <td>
                                      <Badge bg="primary">{item.portionSize}</Badge>
                                    </td>
                                    <td>
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleRemoveItem(item.id)}
                                        title="Remove item from group"
                                      >
                                        <i className="bi bi-trash me-1"></i>
                                        Remove
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Group Item Modal */}
        <AddGroupItemModal
          isModalOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          selectedGroupName={selectedGroupName}
          addItemToGroup={async (itemId: number, portionSize: number) => {
            await handleAddItem({ subItemId: itemId, portionSize });
          }}
        />

        {/* Confirmation Modal */}
        <Modal show={showConfirmation} onHide={() => setShowConfirmation(false)}>
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-exclamation-triangle text-warning me-2"></i>
              Confirm Removal
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to remove this item from the group?</p>
            <p className="text-muted small">This action cannot be undone.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRemoveItem}>
              <i className="bi bi-trash me-1"></i>
              Remove Item
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </RoleAwareLayout>
  );
}

export default GroupedItemsPage;