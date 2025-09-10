"use client";

import React, { useState, useEffect, useRef } from "react";
import ViewItems from "../admin/menu/category/components/items/items-view";
import Categories from "../admin/menu/category/components/category/categories";
import { Item } from "../types/types";
import QuantityModal from "./QuantityModal";
import jwt from "jsonwebtoken";
import { DecodedToken } from "../components/SecureRoute";
import { Button, Modal } from "react-bootstrap";
import ReceiptPrint, { CaptainOrderPrint, CustomerCopyPrint } from './ReceiptPrint';
import { printReceiptWithTimestamp, downloadReceiptAsFile } from './printUtils';
import ReactDOM from "react-dom/client";

const BillingSection = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [fetchCategoryError, setFetchCategoryError] = useState("");
  const [itemError, setItemError] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [waitress, setWaitress] = useState("");
  const [userId, setUserId] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [createdBill, setCreatedBill] = useState(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decodedToken = jwt.decode(token) as DecodedToken;
    if (decodedToken && decodedToken.user) {
      setWaitress(decodedToken.user.firstname);
      setUserId(decodedToken.id.toString());
    }
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/categories", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          setFetchCategoryError("Failed to fetch categories: " + data);
          throw new Error("Failed to fetch categories");
        }
        setCategories(data);
      } catch (error: any) {
        setFetchCategoryError("Failed to fetch categories: " + error);
      }
    };
    fetchCategories();
  }, []);

  const fetchItems = async (categoryId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/menu/items?category=${categoryId}&billing=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403 && data.missingPermissions) {
          throw new Error(`Access denied: Missing ${data.missingPermissions.join(", ")} permission(s)`);
        }
        throw new Error(data.message || "Failed to fetch items");
      }
      setItems(data);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to fetch items for the selected category";
      setItemError(errorMessage);
    }
  };

  const handlePickItem = (item: Item) => {
    if (!item.price) {
      return;
    }
    setCurrentItem(item);
    setShowQuantityModal(true);
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (currentItem) {
      setSelectedItems((prev) => {
        const existingItemIndex = prev.findIndex(
          (i) => i.id === currentItem.id,
        );
        if (existingItemIndex >= 0) {
          const updatedItems = [...prev];
          updatedItems[existingItemIndex].quantity = quantity;
          updatedItems[existingItemIndex].subtotal =
            currentItem.price * quantity;
          return updatedItems;
        } else {
          return [
            ...prev,
            {
              ...currentItem,
              quantity,
              subtotal: currentItem.price * quantity,
            },
          ];
        }
      });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleShowSubmitModal = () => setShowSubmitModal(true);
  const handleCloseSubmitModal = () => setShowSubmitModal(false);
  const handleShowCancelModal = () => setShowCancelModal(true);
  const handleCloseCancelModal = () => setShowCancelModal(false);

  const handleConfirmSubmit = async () => {
    const token = localStorage.getItem("token");
    const total = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const payload = {
      items: selectedItems.map((item) => ({
        item_id: item.id,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      user_id: userId,
      total,
    };
    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to submit picked items");
      }
      const data = await response.json();
      setShowSubmitModal(false);
      setCreatedBill({
        ...data.bill,
        bill_items: selectedItems.map(item => ({
          ...item,
          item: { name: item.name, price: item.price },
        })),
        user: { firstName: waitress },
        currency: "KES",
      });
    } catch (error: any) {
      console.error("Error submitting items:", error);
    }
  };

  const handlePrint = async () => {
    if (!createdBill) return;

    // Print Captain Order first
    await printReceipt(CaptainOrderPrint, createdBill, "Captain Order");

    // Wait a moment, then print Customer Copy
    setTimeout(async () => {
      await printReceipt(CustomerCopyPrint, createdBill, "Customer Copy");
    }, 1000);
  };

  const printReceipt = async (Component: any, bill: any, title: string) => {
    // Determine the type based on the component
    let type: 'customer' | 'captain' | 'receipt' = 'receipt';
    if (Component === CustomerCopyPrint) {
      type = 'customer';
    } else if (Component === CaptainOrderPrint) {
      type = 'captain';
    }

    return printReceiptWithTimestamp(Component, bill, title, type);
  };

  const handleDownload = async () => {
    if (!createdBill) return;

    // Download Customer Copy
    await downloadReceiptAsFile(CustomerCopyPrint, createdBill, 'customer');
  };

  const handleConfirmCancel = () => {
    window.location.reload();
  };

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );

  return (
    <div className="container">
      <div className="row">
        <div className="col-6">
          <ViewItems
            selectedCategory={selectedCategory}
            items={items}
            itemError={itemError}
            setItems={setItems}
            isBillingSection={true}
            isPricelistSection={false}
            isCategoryItemsSection={false}
            onItemPick={createdBill ? undefined : handlePickItem}
          />
        </div>
        <div className="col">
          <h5>Billing</h5>
          <table className="table stripped">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Subtotal</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(createdBill ? createdBill.bill_items : selectedItems).map((item) => (
                <tr key={item.id}>
                  <td>{item.item?.name || item.name}</td>
                  <td>{item.quantity}</td>
                  <td>${(item.subtotal || (item.price * item.quantity)).toFixed(2)}</td>
                  <td>
                    {!createdBill && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3">
            <div style={{ fontWeight: 600, fontSize: 18 }}>
              Total Amount: $
              {createdBill && !isNaN(Number(createdBill.total))
                ? Number(createdBill.total).toFixed(2)
                : totalAmount.toFixed(2)
              }
            </div>
            <div style={{ fontSize: 16 }}>
              Served By: {waitress}
            </div>
          </div>
          <Button
            variant="success"
            onClick={handleShowSubmitModal}
            disabled={selectedItems.length === 0 || !!createdBill}
          >
            Create Bill
          </Button>
          {createdBill && (
            <>
              <Button
                className="m-2"
                variant="secondary"
                onClick={handlePrint}
              >
                Print Receipt
              </Button>
              <Button
                className="m-2"
                variant="outline-primary"
                onClick={handleDownload}
              >
                Download Receipt
              </Button>
            </>
          )}
          <div style={{ display: 'none' }}>
            {createdBill && <ReceiptPrint ref={receiptRef} bill={createdBill} />}
          </div>
          <Button
            className="m-2"
            variant="secondary"
            onClick={handleShowCancelModal}
          >
            Cancel
          </Button>
        </div>
      </div>
      <div className="row">
        <div className="col mt-5">
          <Categories
            categories={categories}
            onCategoryClick={(category) => {
              setSelectedCategory(category);
              fetchItems(category.id);
            }}
            fetchError={fetchCategoryError}
          />
        </div>
      </div>
      {/* Quantity Modal */}
      {showQuantityModal && (
        <QuantityModal
          item={currentItem}
          onClose={() => setShowQuantityModal(false)}
          onConfirm={handleQuantityConfirm}
        />
      )}

      {/* Submit Confirmation Modal */}
      <Modal show={showSubmitModal} onHide={handleCloseSubmitModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Billing</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Create bill of total amount:
          <b>{totalAmount}</b>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseSubmitModal}>
            Cancel
          </Button>
          <Button
            className="btn-success"
            variant="primary"
            onClick={handleConfirmSubmit}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal show={showCancelModal} onHide={handleCloseCancelModal}>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Billing</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to cancel billing?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCancelModal}>
            No
          </Button>
          <Button variant="primary" onClick={handleConfirmCancel}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BillingSection;
