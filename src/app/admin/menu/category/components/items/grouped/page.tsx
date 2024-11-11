"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import AdminLayout from "../../../../../../shared/AdminLayout";
import {
  Modal,
  Button,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "react-bootstrap";
import AsyncSelect from "react-select/async"; // For typeahead searchable dropdown

function GroupedItemsPage() {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupItems, setGroupItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // For storing selected item
  const [portionSize, setPortionSize] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // State for group search term

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    // Filter groups based on the search term
    setFilteredGroups(
      groups.filter((group) =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [searchTerm, groups]);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/menu/items/groups", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch groups");
      const data = await response.json();
      setGroups(data);
      setFilteredGroups(data); // Initialize filtered groups with all groups
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchItems = async (inputValue) => {
    // Fetch item names from the backend based on the search input
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/menu/items?search=${inputValue}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch items");
      const data = await response.json();
      return data.map((item) => ({
        label: item.name, // Display name
        value: item.id, // Use item ID as the value
      }));
    } catch (error) {
      console.error("Error fetching items:", error);
      return [];
    }
  };

  const handleGroupSelect = (groupId) => {
    const groupData = groups.find((group) => group.id === groupId);
    if (groupData) {
      setGroupItems(groupData.items || []);
      setSelectedGroup(groupId);
    }
  };

  const addItemToGroup = async () => {
    try {
      if (!selectedItem || !portionSize) {
        alert("Please fill in both fields.");
        return;
      }

      const response = await fetch(`/api/groups/${selectedGroup}/items/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItem.value,
          portionSize: portionSize,
        }),
      });
      if (!response.ok) throw new Error("Failed to add item");

      fetchGroupItems(selectedGroup);
      closeModal();
    } catch (error) {
      console.error("Error adding item to group:", error);
    }
  };

  const fetchGroupItems = async (groupId) => {
    try {
      const response = await fetch(`/api/menu/items/groups/${groupId}/items`);
      if (!response.ok) throw new Error("Failed to fetch group items");
      const data = await response.json();
      setGroupItems(data);
      setSelectedGroup(groupId);
    } catch (error) {
      console.error("Error fetching group items:", error);
    }
  };

  const removeItemFromGroup = async (itemId) => {
    try {
      const response = await fetch(
        `/api/groups/${selectedGroup}/items/${itemId}/remove`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Failed to remove item");
      fetchGroupItems(selectedGroup);
    } catch (error) {
      console.error("Error removing item from group:", error);
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null); // Reset selected item
    setPortionSize("");
  };

  return (
    <AdminLayout>
      <div className="container my-5">
        <div className="row">
          {/* Sidebar: Group List */}
          <div className="col-md-4">
            <h4>Groups</h4>
            <div className="mb-3">
              {/* Search Input */}
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
              style={{ maxHeight: "400px", overflowY: "auto" }} // Make sidebar scrollable
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

          {/* Main Content: Group Items */}
          <div className="col-md-8">
            <h4>
              Items in Group{" "}
              {selectedGroup
                ? `: ${groups.find((group) => group.id === selectedGroup)?.name}`
                : ""}
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.length > 0 ? (
                      groupItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => removeItemFromGroup(item.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2">No items available.</td>
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

      {/* Modal for Adding Item */}
      <Modal show={isModalOpen} onHide={closeModal}>
        <ModalHeader closeButton>
          <ModalTitle>Add New Item</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="form-group">
            <label htmlFor="item-select">Select Item</label>
            <AsyncSelect
              id="item-select"
              cacheOptions
              loadOptions={fetchItems} // Fetch items from backend
              onChange={setSelectedItem} // Set selected item
              value={selectedItem}
              getOptionLabel={(e) => e.label} // Display item name
              getOptionValue={(e) => e.value} // Use item ID as value
              placeholder="Search for an item"
            />
          </div>
          <div className="form-group">
            <label htmlFor="portion-size">Portion Size</label>
            <input
              type="number"
              id="portion-size"
              className="form-control"
              value={portionSize}
              onChange={(e) => setPortionSize(e.target.value)}
              placeholder="Enter portion size"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>
            Close
          </Button>
          <Button variant="primary" onClick={addItemToGroup}>
            Add Item
          </Button>
        </ModalFooter>
      </Modal>
    </AdminLayout>
  );
}

export default GroupedItemsPage;
