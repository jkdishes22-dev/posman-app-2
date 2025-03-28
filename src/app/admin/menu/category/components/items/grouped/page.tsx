"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import AdminLayout from "../../../../../../shared/AdminLayout";
import AddGroupItemModal from "./add-group-item";
import { Modal, Button } from "react-bootstrap";

function GroupedItemsPage() {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [groupItems, setGroupItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    setFilteredGroups(
      groups.filter((group) =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [searchTerm, groups]);

  const fetchGroups = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("/api/menu/items/groups", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch groups");
      const data = await response.json();
      setGroups(data);
      setFilteredGroups(data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const handleGroupSelect = async (groupId) => {
    const groupData = groups.find((group) => group.id === groupId);

    console.log("group  Data " + JSON.stringify(groupData));
    if (groupData) {
      setSelectedGroup(groupId);
      setSelectedGroupName(groupData.name);
      await fetchGroupItemsFromBackend(groupId);
    }
  };

  const addItemToGroup = async (itemId, portionSize) => {
    if (!selectedGroup) {
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/menu/items/groups/${selectedGroup}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId: selectedGroup,
          subItemId: itemId,
          portionSize: portionSize,
        }),
      });
      if (!response.ok) throw new Error("Failed to add item");

      await fetchGroupItemsFromBackend(selectedGroup);
      closeModal();
    } catch (error) {
      console.error("Error adding item to group:", error);
    }
  };

  const fetchGroupItemsFromBackend = async (groupId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/menu/items/groups/${groupId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch group items");
      const data = await response.json();

      // Ensure the items are extracted and set correctly
      console.log("data fetched from the backend " + JSON.stringify(data));

      const items = data[0].items || [];
      setGroupItems(items);
      updateGroupsInState(groupId, items);
    } catch (error) {
      console.error("Error fetching group items:", error);
    }
  };

  const updateGroupsInState = (groupId, updatedItems) => {
    const updatedGroups = groups.map((group) => {
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
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `/api/menu/items/groups/${selectedGroup}/items/${itemId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error("Failed to remove item");

      await fetchGroupItemsFromBackend(selectedGroup);
    } catch (error) {
      console.error("Error removing item from group:", error);
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <AdminLayout>
      <div className="container my-5">
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
                filteredGroups.map((group) => (
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
                      groupItems.map((item) => (
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
                        <td colSpan="3">No items available.</td>
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
        selectedGroup={selectedGroup}
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
    </AdminLayout>
  );
}

export default GroupedItemsPage;
