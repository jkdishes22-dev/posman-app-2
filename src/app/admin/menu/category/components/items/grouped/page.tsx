"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import AddGroupItemModal from "./add-group-item";
import { Modal, Button } from "react-bootstrap";
import { useApiCall } from "../../../../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../../../../utils/errorUtils";
import ErrorDisplay from "../../../../../../components/ErrorDisplay";

function GroupedItemsPage() {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [groupItems, setGroupItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  const apiCall = useApiCall();

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    setFilteredGroups(
      groups.filter((group: any) =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [searchTerm, groups]);

  const fetchGroups = async () => {
    try {
      const result = await apiCall("/api/menu/items/groups");
      if (result.status === 200) {
        setGroups(result.data);
        setFilteredGroups(result.data);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch groups");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleGroupSelect = async (groupId: any) => {
    const groupData: any = groups.find((group: any) => group?.id === groupId);

    if (groupData) {
      setSelectedGroup(groupId);
      setSelectedGroupName(groupData.name);
      await fetchGroupItemsFromBackend(groupId);
    }
  };

  const addItemToGroup = async (itemId: number, portionSize: number) => {
    if (!selectedGroup) {
      return;
    }
    try {
      const result = await apiCall(`/api/menu/items/groups/${selectedGroup}`, {
        method: "POST",
        body: JSON.stringify({
          itemId: selectedGroup,
          subItemId: itemId,
          portionSize: portionSize,
        }),
      });
      if (result.status === 200) {
        await fetchGroupItemsFromBackend(selectedGroup);
        closeModal();
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to add item");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const fetchGroupItemsFromBackend = async (groupId: number) => {
    try {
      const result = await apiCall(`/api/menu/items/groups/${groupId}`);
      if (result.status === 200) {
        // Ensure the items are extracted and set correctly
        const items = result.data[0].items || [];
        setGroupItems(items);
        updateGroupsInState(groupId, items);
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

  const updateGroupsInState = (groupId: number, updatedItems: any) => {
    const updatedGroups: any = groups.map((group: any) => {
      if (group.id === groupId) {
        return { ...group, items: updatedItems };
      }
      return group;
    });
    setGroups(updatedGroups);
    setFilteredGroups(updatedGroups);
  };

  const confirmRemoveItem = (itemId: number) => {
    setItemToRemove(itemId);
    setShowConfirmation(true);
  };

  const handleConfirmRemove = async () => {
    setShowConfirmation(false);
    if (itemToRemove !== null) {
      await removeItemFromGroup(itemToRemove);
      setItemToRemove(null);
    }
  };

  const removeItemFromGroup = async (itemId: number) => {
    if (!selectedGroup) {
      return;
    }
    try {
      const result = await apiCall(
        `/api/menu/items/groups/${selectedGroup}/items/${itemId}`,
        {
          method: "DELETE",
        },
      );
      if (result.status === 200) {
        await fetchGroupItemsFromBackend(selectedGroup);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to remove item");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <RoleAwareLayout>
      <div className="container my-5">
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />
        <div className="row">
          <div className="col-md-4">
            <h4>Groups</h4>
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Search Groups"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div
              className="list-group"
              style={{ maxHeight: "400px", overflowY: "auto" }}
            >
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group: any) => (
                  <li
                    key={group.id}
                    className="list-group-item list-group-item-action"
                    onClick={() => handleGroupSelect(group.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {group.name}
                  </li>
                ))
              ) : (
                <li className="list-group-item">No groups found</li>
              )}
            </div>
          </div>

          <div className="col-md-8">
            <h4>
              Items in Group {selectedGroup ? `: ${selectedGroupName}` : ""}
            </h4>
            {selectedGroup ? (
              <>
                <button className="btn btn-success mb-3" onClick={openModal}>
                  Add New Item
                </button>
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Portion size</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.length > 0 ? (
                      groupItems.map((item: any) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.portionSize}</td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => confirmRemoveItem(item.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>No items available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            ) : (
              <p>Select a group to view its items.</p>
            )}
          </div>
        </div>
      </div>

      <AddGroupItemModal
        isModalOpen={isModalOpen}
        closeModal={closeModal}
        // selectedGroup={selectedGroup}
        selectedGroupName={selectedGroupName}
        addItemToGroup={addItemToGroup}
      />

      <Modal show={showConfirmation} onHide={() => setShowConfirmation(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Action</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove this item from the group?
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

export default GroupedItemsPage;
