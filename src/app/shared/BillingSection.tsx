"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import styles from "./BillingSection.module.css";
import { usePathname } from "next/navigation";
import { Item } from "../types/types";
import QuantityModal from "./QuantityModal";
import { Button, Modal, Alert, Row, Col, Spinner } from "react-bootstrap";

// Lazy load heavy components for code splitting (reduces initial bundle size)
const ViewItems = lazy(() => import("../admin/menu/category/components/items/items-view"));
const Categories = lazy(() => import("../admin/menu/category/components/category/categories"));
const CategoryDeleteModal = lazy(() => import("../admin/menu/category/components/category/category-delete"));
import ReceiptPrint, { CustomerCopyPrint, defaultReceiptBranding, type ReceiptBranding } from "./ReceiptPrint";
import {
  printCaptainCopyOnly,
  printCaptainOrderAndCustomerCopy,
  printCustomerCopyOnly,
  downloadReceiptAsFile,
  logClientFromRenderer
} from "./printUtils";
import { normalizePrinterSettings } from "./printerSettings";
import { useStation } from "../contexts/StationContext";
import { usePricelist } from "../contexts/PricelistContext";
import { useAuth } from "../contexts/AuthContext";
import ErrorDisplay from "../components/ErrorDisplay";
import StationSelector from "../components/StationSelector";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import { fireCashSettle, fireMpesaSettle } from "../utils/billCashSettle";
import SubmitBillVirtualKeyboard from "../components/SubmitBillVirtualKeyboard";
import SubmitBillModal from "../home/my-sales/submit-bill";

const INVENTORY_TTL_MS = 15000;

const BillingSection = () => {
  const pathname = usePathname();
  // Auth context
  const { isAuthenticated, logout, user } = useAuth();

  // Station context
  const { currentStation, isLoading: stationLoading, error: stationError } = useStation();

  // Pricelist context
  const { currentPricelist, isLoading: pricelistLoading } = usePricelist();

  // API call hook
  const apiCall = useApiCall();

  // Existing state
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [allPricelistItems, setAllPricelistItems] = useState<Item[]>([]); // All items for current pricelist
  const [itemsPreloaded, setItemsPreloaded] = useState(false); // Track if all items are preloaded
  const [fetchCategoryError, setFetchCategoryError] = useState("");
  const [itemError, setItemError] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [waitress, setWaitress] = useState("");
  const [userId, setUserId] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cashSettled, setCashSettled] = useState(false);
  const [mpesaSettled, setMpesaSettled] = useState(false);
  const [mpesaRef, setMpesaRef] = useState("");
  const [mpesaRefValidationError, setMpesaRefValidationError] = useState("");
  const [isValidatingMpesaRef, setIsValidatingMpesaRef] = useState(false);
  const [createdBill, setCreatedBill] = useState(null);
  const [billAutoSettled, setBillAutoSettled] = useState(false);
  const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);
  const [billError, setBillError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoriesFetched, setCategoriesFetched] = useState(false);
  const [categoryGridExpanded, setCategoryGridExpanded] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [itemInventory, setItemInventory] = useState<Record<number, number>>({});
  const [missingConstituents, setMissingConstituents] = useState<Record<number, Array<{ itemId: number; itemName: string; available: number; required: number }>>>({});
  const [, setHasExpandedItems] = useState<boolean>(false);
  const inventoryRefreshInFlightRef = useRef<string | null>(null);
  const inventorySnapshotRef = useRef<Record<number, number>>({});
  const inventoryFetchedAtRef = useRef<Record<number, number>>({});
  const visibleItemIdsRef = useRef<number[]>([]);

  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showCategoryDeleteModal, setShowCategoryDeleteModal] = useState(false);
  const [categoryDeleteError, setCategoryDeleteError] = useState<string | null>(null);
  const [categoryDeleteErrorDetails, setCategoryDeleteErrorDetails] = useState<ApiErrorResponse | null>(null);

  /** When true, print customer + captain (2 jobs) after creating a pending bill from billing. Cashier close bill never prints; My Sales Print is customer copy only. */
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [autoPrintPrinterName, setAutoPrintPrinterName] = useState("");
  const [autoPrintCopyMode, setAutoPrintCopyMode] = useState<"customer" | "business" | "both">("both");
  const [showTax, setShowTax] = useState(true);
  const [showPaymentMode, setShowPaymentMode] = useState(true);
  const [receiptBranding, setReceiptBranding] = useState<ReceiptBranding>(() => defaultReceiptBranding());
  const [showingTopItems, setShowingTopItems] = useState(false);
  const [topNLimit, setTopNLimit] = useState(10);
  const [topNLookbackDays, setTopNLookbackDays] = useState(30);

  /** While a pending bill is open, exclude it from pending-demand so totals match server validation. */
  const pendingBillExcludeIdRef = useRef<number | undefined>(undefined);

  // Sales rep label (bill tags) state
  interface BillTag { id: string; name: string; color: string; }
  const [billTags, setBillTags] = useState<BillTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>(""); // single-select: tag name
  const [billNote, setBillNote] = useState("");

  const cleanupModalArtifacts = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("padding-right");
    document.body.style.removeProperty("overflow");
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.remove();
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      logout();
      return;
    }

    // Initialize user synchronously from context (no API call needed)
    if (user && user.id) {
      setUserId(user.id.toString());
      setWaitress(user.firstName || user.firstname || "");
    }
    // Note: Stations and pricelists are already loaded by their respective contexts on mount
    // No need to call loadStationsIfNeeded/loadPricelistsIfNeeded here as contexts handle it
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (createdBill && String(createdBill.status).toLowerCase() === "pending" && createdBill.id) {
      pendingBillExcludeIdRef.current = Number(createdBill.id);
    } else {
      pendingBillExcludeIdRef.current = undefined;
    }
  }, [createdBill]);

  // Load printer and bill settings once on mount
  useEffect(() => {
    apiCall("/api/system/receipt-printer-prefs").then((res) => {
      if (res.status === 200 && res.data?.value != null) {
        const p = normalizePrinterSettings(res.data.value);
        setAutoPrintEnabled(p.print_after_create_bill);
        setAutoPrintPrinterName(p.printer_name);
        setAutoPrintCopyMode(p.auto_print_copy_mode || "both");
      }
      if (res.status === 200 && res.data?.receipt_display) {
        setReceiptBranding(res.data.receipt_display);
      }
    }).catch(() => {});
    apiCall("/api/system/settings?key=bill_settings").then((res) => {
      if (res.status === 200 && res.data?.value) {
        setShowTax(res.data.value.show_tax_on_receipt !== false);
        setShowPaymentMode(res.data.value.show_payment_on_receipt !== false);
        if (res.data.value.top_n_billing_items) setTopNLimit(Number(res.data.value.top_n_billing_items));
        if (res.data.value.top_n_lookback_days) setTopNLookbackDays(Number(res.data.value.top_n_lookback_days));
        if (Array.isArray(res.data.value.bill_tags)) setBillTags(res.data.value.bill_tags);
      }
    }).catch(() => {});
  }, []);

  // Defensive cleanup to prevent stale modal backdrops from blocking navigation.
  useEffect(() => {
    setShowSubmitModal(false);
    setShowCancelModal(false);
    setShowQuantityModal(false);
    cleanupModalArtifacts();
  }, [pathname, cleanupModalArtifacts]);

  useEffect(() => {
    return () => {
      cleanupModalArtifacts();
    };
  }, [cleanupModalArtifacts]);

  // Prefetch categories when station is available (optimized loading)
  useEffect(() => {
    // Only fetch categories if we have a station and haven't fetched yet
    if (categoriesFetched || !currentStation) return;

    const fetchCategories = async () => {
      try {
        setCategoriesFetched(true);
        const result = await apiCall("/api/menu/categories");
        if (result.status === 200) {
          setCategories(result.data);
        } else {
          setFetchCategoryError("Failed to fetch categories: " + result.error);
          setErrorDetails(result.errorDetails);
          setCategoriesFetched(false); // Reset on error to allow retry
        }
      } catch (error: any) {
        setFetchCategoryError("Failed to fetch categories: " + error.message);
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        setCategoriesFetched(false); // Reset on error to allow retry
      }
    };

    // Fetch immediately when station is available (no delay)
    fetchCategories();
  }, [currentStation, categoriesFetched, apiCall]);

  const fetchItemInventory = useCallback(async (itemIds: number[], includeDetails: boolean = true) => {
    if (itemIds.length === 0) {
      return;
    }

    try {
      const itemIdsParam = itemIds.join(",");
      const ex = pendingBillExcludeIdRef.current;
      const excludeQs = ex ? `&excludeBillId=${ex}` : "";
      const url = includeDetails
        ? `/api/inventory/available?itemIds=${itemIdsParam}&includeDetails=true${excludeQs}`
        : `/api/inventory/available?itemIds=${itemIdsParam}${excludeQs}`;
      const result = await apiCall(url);

      if (result.status === 200) {
        const available = result.data.available || {};
        const now = Date.now();

        // Update in-memory snapshot for instant category switches.
        inventorySnapshotRef.current = {
          ...inventorySnapshotRef.current,
          ...available,
        };
        Object.keys(available).forEach((itemId) => {
          inventoryFetchedAtRef.current[Number(itemId)] = now;
        });

        setItemInventory((prev) => ({
          ...prev,
          ...available,
        }));

        if (includeDetails && result.data.missingConstituents) {
          setMissingConstituents((prev) => ({
            ...prev,
            ...result.data.missingConstituents,
          }));
        }
      }
    } catch (error) {
      // Silently fail - inventory display is optional
      console.error("Error fetching item inventory:", error);
    }
  }, [apiCall]);

  const applyCachedInventory = useCallback((itemIds: number[]) => {
    if (itemIds.length === 0) {
      return;
    }

    const cachedSubset: Record<number, number> = {};
    for (const itemId of itemIds) {
      if (itemId in inventorySnapshotRef.current) {
        cachedSubset[itemId] = inventorySnapshotRef.current[itemId];
      }
    }

    if (Object.keys(cachedSubset).length > 0) {
      setItemInventory((prev) => ({
        ...prev,
        ...cachedSubset,
      }));
    }
  }, []);

  const refreshAvailability = useCallback(async (
    scope: "visible" | "all" | "custom" = "visible",
    customItemIds: number[] = [],
    options: { force?: boolean; background?: boolean } = {}
  ) => {
    let targetIds: number[] = [];

    if (scope === "all") {
      targetIds = allPricelistItems.map((item: Item) => item.id);
    } else if (scope === "custom") {
      targetIds = customItemIds;
    } else {
      targetIds = visibleItemIdsRef.current;
    }

    // Normalize/unique to avoid duplicate API calls for equivalent sets.
    const uniqueSortedIds = Array.from(new Set(targetIds)).sort((a, b) => a - b);
    if (uniqueSortedIds.length === 0) {
      return;
    }

    const now = Date.now();
    const staleIds = uniqueSortedIds.filter((id) => {
      const fetchedAt = inventoryFetchedAtRef.current[id];
      if (!fetchedAt) return true;
      return (now - fetchedAt) > INVENTORY_TTL_MS;
    });

    const idsToFetch = options.force ? uniqueSortedIds : staleIds;
    if (idsToFetch.length === 0) {
      return;
    }

    const requestKey = idsToFetch.join(",");
    if (inventoryRefreshInFlightRef.current === requestKey) {
      return;
    }

    inventoryRefreshInFlightRef.current = requestKey;
    const runFetch = async () => {
      try {
        await fetchItemInventory(idsToFetch, true);
      } finally {
        if (inventoryRefreshInFlightRef.current === requestKey) {
          inventoryRefreshInFlightRef.current = null;
        }
      }
    };

    if (options.background) {
      runFetch();
      return;
    }

    await runFetch();
  }, [allPricelistItems, fetchItemInventory]);

  // Preload all items and inventory for the pricelist when available
  useEffect(() => {
    if (!currentPricelist || itemsPreloaded) return;

    const preloadAllItems = async () => {
      try {
        // Fetch all items for the pricelist (no category filter)
        const result = await apiCall(
          `/api/menu/items/pricelist?pricelistId=${currentPricelist.id}`
        );

        if (result.status === 200) {
          const allItems = result.data.items || [];
          setAllPricelistItems(allItems);
          setItemsPreloaded(true);

          // Preload inventory for all items via refreshAvailability so the in-flight guard
          // is set — prevents a duplicate fetch when the user selects a category before
          // this response arrives.
          if (allItems.length > 0) {
            const itemIds = allItems.map((item: Item) => item.id);
            await refreshAvailability("custom", itemIds, { force: true });
          }
        }
      } catch (error) {
        // Silently fail - will fall back to category-based loading
        console.error("Error preloading items:", error);
      }
    };

    // Preload in background (non-blocking)
    preloadAllItems();
  }, [currentPricelist, itemsPreloaded, apiCall, refreshAvailability]);

  const fetchTopItems = useCallback(async () => {
    if (!currentPricelist) return;
    try {
      const result = await apiCall(
        `/api/menu/items/top-selling?pricelistId=${currentPricelist.id}&limit=${topNLimit}&lookbackDays=${topNLookbackDays}`
      );
      if (result.status === 200) {
        const topItems = result.data.items || [];
        setItems(topItems);
        setShowingTopItems(topItems.length > 0);
        if (topItems.length > 0) {
          const itemIds = topItems.map((i: Item) => i.id);
          refreshAvailability("custom", itemIds);
        }
      } else {
        setItems([]);
        setShowingTopItems(false);
      }
    } catch {
      setItems([]);
      setShowingTopItems(false);
    }
  }, [currentPricelist, topNLimit, topNLookbackDays, apiCall, refreshAvailability]);

  // Memoized fetchItems - uses preloaded data if available, otherwise fetches from API
  const fetchItems = useCallback(async (
    categoryId: string,
    options: { preferCache?: boolean } = {}
  ) => {
    if (!currentPricelist) {
      setItemError("No pricelist selected. Please select a pricelist first.");
      return;
    }

    // If items are preloaded, filter client-side for instant switching
    if (itemsPreloaded && allPricelistItems.length > 0) {
      const filteredItems = allPricelistItems.filter(
        (item: Item) => item.category?.id === categoryId || String(item.category?.id) === String(categoryId)
      );
      setItems(filteredItems);
      setItemError(""); // Clear any previous errors

      // Category switching can imply a new bill attempt. Revalidate visible availability.
      if (filteredItems.length > 0) {
        const itemIds = filteredItems.map((item: Item) => item.id);
        if (options.preferCache) {
          applyCachedInventory(itemIds);
          refreshAvailability("custom", itemIds, { background: true });
        } else {
          refreshAvailability("custom", itemIds);
        }
      }
      return;
    }

    // Fallback: Fetch from API if preload hasn't completed
    try {
      const result = await apiCall(
        `/api/menu/items/pricelist?pricelistId=${currentPricelist.id}&categoryId=${categoryId}`
      );

      if (result.status === 200) {
        const fetchedItems = result.data.items || [];
        setItems(fetchedItems);
        setItemError(""); // Clear any previous errors

        // Refresh visible inventory when category is loaded.
        if (fetchedItems.length > 0) {
          const itemIds = fetchedItems.map((item: Item) => item.id);
          if (options.preferCache) {
            applyCachedInventory(itemIds);
            refreshAvailability("custom", itemIds, { background: true });
          } else {
            refreshAvailability("custom", itemIds);
          }
        }
      } else {
        setItemError(result.error || "Failed to fetch items for this pricelist");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to fetch items for the selected category and pricelist";
      setItemError(errorMessage);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  }, [currentPricelist, apiCall, itemsPreloaded, allPricelistItems, refreshAvailability, applyCachedInventory]);

  // Refetch items when pricelist or category changes
  useEffect(() => {
    visibleItemIdsRef.current = items.map((item: Item) => item.id);
  }, [items]);

  useEffect(() => {
    if (currentPricelist && selectedCategory) {
      fetchItems(selectedCategory.id);
    } else if (currentPricelist && !selectedCategory) {
      fetchTopItems();
    }
  }, [currentPricelist?.id, selectedCategory?.id, fetchItems, fetchTopItems]);

  // Reset preload state when pricelist changes
  useEffect(() => {
    setItemsPreloaded(false);
    setAllPricelistItems([]);
    setItems([]);
    setShowingTopItems(false);
  }, [currentPricelist?.id]);

  // Reset categories and items when the station changes so they reload for the new station
  useEffect(() => {
    if (!currentStation) return;
    setCategoriesFetched(false);
    setCategories([]);
    setSelectedCategory(null);
    setItems([]);
    setItemsPreloaded(false);
    setAllPricelistItems([]);
  }, [currentStation?.id]);

  const handlePickItem = useCallback((item: Item) => {
    if (!item.price) {
      return;
    }

    // Check available inventory before allowing pick
    const available = itemInventory[item.id] ?? 0;
    // If item has inventory tracking and no stock available, show error with missing constituents
    // Skip this check for items that allow negative inventory
    if (available === 0 && item.id in itemInventory && !item.allowNegativeInventory) {
      const missing = missingConstituents[item.id];
      if (missing && missing.length > 0) {
        const missingList = missing.map(c => `${c.itemName} (Available: ${c.available}, Required: ${c.required} per unit)`).join(", ");
        setBillError(
          `Cannot add ${item.name}. Missing ingredients: ${missingList}. ` +
          "Please issue these items to inventory first."
        );
      } else {
        setBillError(`Cannot add ${item.name}. No inventory available. Please issue more ${item.name} to inventory first.`);
      }
      return;
    }

    setCurrentItem(item);
    setShowQuantityModal(true);
  }, [itemInventory, selectedItems, missingConstituents]);

  const handleQuantityConfirm = useCallback((quantity: number) => {
    if (!currentItem) {
      return;
    }

    // Validate inventory before adding
    const available = itemInventory[currentItem.id] ?? 0;
    const alreadyInBill = selectedItems.find(i => i.id === currentItem.id);
    const alreadyReserved = alreadyInBill ? alreadyInBill.quantity : 0;
    const availableAfterReserved = available - alreadyReserved;

    // If item has inventory tracking, validate quantity (skip for allow-negative items)
    if (currentItem.id in itemInventory && !currentItem.allowNegativeInventory) {
      if (availableAfterReserved < quantity) {
        setBillError(
          `Cannot add ${quantity} ${currentItem.name}. ` +
          `Only ${availableAfterReserved} available (${available} total - ${alreadyReserved} already in bill). ` +
          `Please issue more ${currentItem.name} to inventory first.`
        );
        return;
      }
    }

    setBillError(""); // Clear any previous errors
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

    // Refresh inventory after adding item to bill to show updated availability
    refreshAvailability("visible", [], { background: true });
  }, [currentItem, itemInventory, selectedItems, refreshAvailability]);

  const handleRemoveItem = useCallback((itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleConfirmBillingCategoryDelete = useCallback(async () => {
    if (!categoryToDelete) return;
    setCategoryDeleteError(null);
    setCategoryDeleteErrorDetails(null);
    try {
      const result = await apiCall(`/api/menu/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });
      if (result.status >= 200 && result.status < 300) {
        setCategories((prev) => (Array.isArray(prev) ? prev.filter((c: { id: string }) => c.id !== categoryToDelete.id) : []));
        if (selectedCategory && (selectedCategory as { id: string }).id === categoryToDelete.id) {
          setSelectedCategory(null);
          setItems([]);
        }
        setShowCategoryDeleteModal(false);
        setCategoryToDelete(null);
      } else {
        setCategoryDeleteError(result.error || "Failed to delete category");
        setCategoryDeleteErrorDetails(result.errorDetails ?? null);
      }
    } catch {
      setCategoryDeleteError("Network error occurred");
      setCategoryDeleteErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  }, [apiCall, categoryToDelete, selectedCategory]);

  const handleShowSubmitModal = useCallback(() => setShowSubmitModal(true), []);
  const handleCloseSubmitModal = useCallback(() => {
    setShowSubmitModal(false);
    setBillError(""); // Clear error when modal is closed
    setErrorDetails(null); // Clear error details when modal is closed
    setCashSettled(false);
    setMpesaSettled(false);
    setMpesaRef("");
    setMpesaRefValidationError("");
    setIsValidatingMpesaRef(false);
    setSelectedTag("");
    setBillNote("");
  }, []);
  const handleMpesaRefCharacter = (ch: string) => {
    setMpesaRef((prev) => (prev + ch).toUpperCase());
  };

  const handleMpesaRefSpecialKey = (key: "Backspace" | "Clear" | "Space") => {
    if (key === "Backspace") setMpesaRef((prev) => prev.slice(0, -1));
    else if (key === "Clear") setMpesaRef("");
    // Space is not valid in M-Pesa references — ignore
  };

  useEffect(() => {
    if (!mpesaSettled || cashSettled || !mpesaRef.trim()) {
      setMpesaRefValidationError("");
      return;
    }
    const id = setTimeout(async () => {
      setIsValidatingMpesaRef(true);
      setMpesaRefValidationError("");
      try {
        const result = await apiCall("/api/payments/check-reference", {
          method: "POST",
          body: JSON.stringify({ reference: mpesaRef.trim() }),
        });
        if (result.status === 200) {
          setMpesaRefValidationError(
            result.data.exists ? "M-Pesa reference already exists. Please use a different code." : ""
          );
        } else {
          setMpesaRefValidationError("Failed to validate M-Pesa reference.");
        }
      } catch {
        setMpesaRefValidationError("Network error while validating M-Pesa reference.");
      } finally {
        setIsValidatingMpesaRef(false);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [mpesaRef, mpesaSettled, cashSettled, apiCall]);

  const handleShowCancelModal = useCallback(() => setShowCancelModal(true), []);
  const handleCloseCancelModal = useCallback(() => setShowCancelModal(false), []);

  const handleConfirmSubmit = async () => {
    if (!currentStation) {
      setBillError("Please select a station before creating a bill");
      return;
    }

    setIsSubmitting(true);
    setBillError(""); // Clear any previous errors

    try {
      // Ensure we have a valid user ID - prefer cached userId, then auth context, then API
      let currentUserId = userId;
      if (!currentUserId || currentUserId === "" || currentUserId === "NaN") {
        // Try to get user ID from auth context first (no API call needed)
        if (user && user.id) {
          currentUserId = user.id.toString();
          setUserId(currentUserId);
        } else {
          // Fallback: fetch user data from API
          try {
            const userResult = await apiCall("/api/users/me");
            if (userResult.status === 200 && userResult.data && userResult.data.id) {
              currentUserId = userResult.data.id.toString();
              setUserId(currentUserId);
            } else {
              setBillError("User information not available. Please refresh the page.");
              setIsSubmitting(false);
              return;
            }
          } catch (error: any) {
            setBillError("Failed to fetch user information. Please refresh the page.");
            setIsSubmitting(false);
            return;
          }
        }
      }

      const total = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const requestId = `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const payload = {
        items: selectedItems.map((item) => ({
          item_id: item.id,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
        user_id: parseInt(currentUserId), // Use the validated user ID
        station_id: currentStation.id,
        total,
        request_id: requestId,
        ...(selectedTag ? { tags: [selectedTag] } : {}),
        ...(billNote.trim() ? { notes: billNote.trim() } : {}),
      };
      try {
        const result = await apiCall("/api/bills", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (result.status === 201) {
          const apiPayload = result.data as { bill?: unknown; id?: number } | undefined;
          const createdFromApi = apiPayload && typeof apiPayload === "object" && "bill" in apiPayload
            ? (apiPayload as { bill: Record<string, unknown> }).bill
            : (apiPayload as Record<string, unknown> | undefined);
          const newBillId = createdFromApi?.id as number | undefined;
          logClientFromRenderer(
            `create-bill: HTTP 201 billId=${newBillId ?? "?"} items=${selectedItems.length} total=${total} autoPrintEnabled=${autoPrintEnabled} cashSettled=${cashSettled} mpesaSettled=${mpesaSettled}`,
          );

          if (cashSettled && !mpesaSettled && newBillId) {
            fireCashSettle(apiCall as Parameters<typeof fireCashSettle>[0], newBillId, total);
            logClientFromRenderer(`create-bill: auto-settle (cash) fired (fire-and-forget) billId=${newBillId}`);
          } else if (mpesaSettled && !cashSettled && newBillId) {
            fireMpesaSettle(apiCall as Parameters<typeof fireMpesaSettle>[0], newBillId, total, mpesaRef.trim());
            logClientFromRenderer(`create-bill: auto-settle (mpesa) fired (fire-and-forget) billId=${newBillId}`);
          }

          setShowSubmitModal(false);
          setBillError(""); // Clear any previous errors
          const billForReceipt = {
            ...((createdFromApi ?? {}) as object),
            id: newBillId,
            bill_items: selectedItems.map(item => ({
              ...item,
              item: { name: item.name, price: item.price },
            })),
            user: { firstName: waitress },
            currency: "KES",
            tags: selectedTag ? JSON.stringify([selectedTag]) : null,
            notes: billNote.trim() || null,
            ...(cashSettled && !mpesaSettled
              ? { receiptPayment: { method: "cash", cashAmount: total } }
              : mpesaSettled && !cashSettled
              ? { receiptPayment: { method: "mpesa", mpesaAmount: total, mpesaRef: mpesaRef.trim() } }
              : {}),
          };
          setBillAutoSettled(cashSettled || mpesaSettled);
          setCreatedBill(billForReceipt);

          // Auto-print on create (optional) then auto-reset; otherwise reset immediately.
          if (autoPrintEnabled) {
            logClientFromRenderer(
              `create-bill: auto-print starting billId=${billForReceipt.id} mode=${autoPrintCopyMode} printer=${autoPrintPrinterName?.trim() ? autoPrintPrinterName : "default"}`,
            );
            (async () => {
              if (autoPrintCopyMode === "customer") {
                const customerPrint = await printCustomerCopyOnly(
                  billForReceipt,
                  autoPrintPrinterName || undefined,
                  { showTax, showPaymentMode, receiptBranding }
                );
                if (!customerPrint.success) {
                  logClientFromRenderer(
                    `create-bill: auto-print finished with errors billId=${billForReceipt.id} customer=${customerPrint.success}`,
                    "WARN",
                  );
                } else {
                  logClientFromRenderer(`create-bill: auto-print finished OK billId=${billForReceipt.id} mode=customer`);
                }
              } else if (autoPrintCopyMode === "business") {
                const captainPrint = await printCaptainCopyOnly(
                  billForReceipt,
                  autoPrintPrinterName || undefined,
                  { showTax, showPaymentMode, receiptBranding }
                );
                if (!captainPrint.success) {
                  logClientFromRenderer(
                    `create-bill: auto-print finished with errors billId=${billForReceipt.id} captain=${captainPrint.success}`,
                    "WARN",
                  );
                } else {
                  logClientFromRenderer(`create-bill: auto-print finished OK billId=${billForReceipt.id} mode=business`);
                }
              } else {
                const { captain: captainPrint, customer: customerPrint } = await printCaptainOrderAndCustomerCopy(
                  billForReceipt,
                  autoPrintPrinterName || undefined,
                  { showTax, showPaymentMode, receiptBranding }
                );
                if (!captainPrint.success || !customerPrint.success) {
                  logClientFromRenderer(
                    `create-bill: auto-print finished with errors billId=${billForReceipt.id} captain=${captainPrint.success} customer=${customerPrint.success}`,
                    "WARN",
                  );
                } else {
                  logClientFromRenderer(`create-bill: auto-print finished OK billId=${billForReceipt.id} mode=both`);
                }
              }
              resetForNewBill();
              setSelectedCategory(null);
            })();
          } else {
            logClientFromRenderer(`create-bill: auto-print skipped (disabled) billId=${billForReceipt.id}`);
            resetForNewBill();
            setSelectedCategory(null);
          }

          // Refresh inventory after bill creation in the background.
          refreshAvailability("all", [], { force: true, background: true });
        } else {
          logClientFromRenderer(
            `create-bill: HTTP ${result.status} error=${result.error || "unknown"}`,
            "WARN",
          );
          setBillError(result.error || "Failed to submit picked items");
          setErrorDetails(result.errorDetails);

          // Refresh inventory after failure to show current stock levels.
          refreshAvailability("all", [], { force: true, background: true });
        }
      } catch (error: any) {
        logClientFromRenderer(
          `create-bill: client exception ${error?.message || String(error)}`,
          "ERROR",
        );
        // Show the actual error message from the API
        const errorMessage = error.message || "Failed to submit picked items";
        setBillError(errorMessage);
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });

        // Refresh inventory after failure to show current stock levels.
        refreshAvailability("all", [], { force: true, background: true });
      }
    } catch (error: any) {
      console.error("Error in bill submission:", error);
      setBillError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = async () => {
    if (!createdBill) return;
    const printer = autoPrintPrinterName || undefined;
    logClientFromRenderer(`print: manual pending bill (billing) mode=${autoPrintCopyMode} printer=${printer ?? "default"} billId=${createdBill.id}`);
    if (autoPrintCopyMode === "customer") {
      await printCustomerCopyOnly(createdBill, printer, { showTax, showPaymentMode, receiptBranding });
    } else if (autoPrintCopyMode === "business") {
      await printCaptainCopyOnly(createdBill, printer, { showTax, showPaymentMode, receiptBranding });
    } else {
      await printCaptainOrderAndCustomerCopy(createdBill, printer, { showTax, showPaymentMode, receiptBranding });
    }
  };

  const handleDownload = async () => {
    if (!createdBill) return;

    // Download Customer Copy
    await downloadReceiptAsFile(CustomerCopyPrint, createdBill, "customer", { showTax, showPaymentMode, receiptBranding });
  };

  const handleConfirmCancel = useCallback(() => {
    // Reset bill state without reloading the page
    setCreatedBill(null);
    setSelectedItems([]);
    setSelectedCategory(null);
    setItems([]); // Clear the available items list
    setWaitress("");
    setUserId("");
    setShowSubmitModal(false);
    setShowCancelModal(false);
    setShowQuantityModal(false);
    setCurrentItem(null);
    setItemError("");
    setFetchCategoryError("");
    setBillError(""); // Clear bill errors
  }, []);

  const resetForNewBill = useCallback(() => {
    // Reset all bill-related state without reloading the page
    setCreatedBill(null);
    setSelectedItems([]);
    setShowSubmitModal(false);
    setShowCancelModal(false);
    setShowQuantityModal(false);
    setCurrentItem(null);
    setItemError("");
    setFetchCategoryError("");
    setBillError(""); // Clear bill errors
    setCashSettled(false);
    setMpesaSettled(false);
    setMpesaRef("");
    setSelectedTag("");
    setBillNote("");
    setBillAutoSettled(false);
    setShowCollectPaymentModal(false);
  }, []);

  const handleNewBill = useCallback(() => {
    resetForNewBill();
    setSelectedCategory(null);
    applyCachedInventory(allPricelistItems.map((item: Item) => item.id));
    refreshAvailability("all", [], { force: true, background: true });
  }, [resetForNewBill, refreshAvailability, applyCachedInventory, allPricelistItems]);

  // Memoized total amount calculation to prevent recalculation on every render
  const totalAmount = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
  }, [selectedItems]);


  // Show error state if station has error
  if (stationError) {
    return (
      <div className="container">
        <Alert variant="danger">
          <Alert.Heading>Station Error</Alert.Heading>
          <p>{stationError}</p>
          <Button variant="outline-danger" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  // Show loading state if station is still loading
  if (stationLoading || !currentStation) {
    // If still loading, show progress indicator
    if (stationLoading) {
      return (
        <div className="container">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
            <div className="text-center w-100">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mb-2">Loading station information...</p>
              <div className="progress" style={{ maxWidth: "400px", margin: "0 auto" }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: "100%" }}
                  aria-valuenow={100}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // If not loading but no station, show selection prompt
    return (
      <div className="container">
        <Alert variant="warning">
          <Alert.Heading>No Station Selected</Alert.Heading>
          <p>Please select a station to start billing.</p>
          <StationSelector allowAllUsers />
        </Alert>
      </div>
    );
  }

  // Show loading state if pricelist is still loading
  if (pricelistLoading || !currentPricelist) {
    // If still loading, show progress indicator
    if (pricelistLoading) {
      return (
        <div className="container">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
            <div className="text-center w-100">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mb-2">Loading pricelist information...</p>
              <div className="progress" style={{ maxWidth: "400px", margin: "0 auto" }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: "100%" }}
                  aria-valuenow={100}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // If not loading but no pricelist, show error message
    return (
      <div className="container">
        <Alert variant="warning">
          <Alert.Heading>No Pricelist Available</Alert.Heading>
          <p>No pricelist is available for your current station. Please contact an administrator.</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`billing-screen ${styles.billingViewport}`}>
      {/* Side-by-side panels: items (left) + current bill (right) */}
      <div className={styles.panelsRow}>
        {/* Available Items Section */}
        <div className={styles.panel}>
          <div className={`card border-0 shadow-sm ${styles.panelCard}`}>
            {createdBill && (
              <div className="card-header border-bottom py-1 px-3 d-flex justify-content-end" style={{ background: "var(--md-warning, #fff3cd)" }}>
                <button
                  className="btn btn-sm btn-warning text-dark fw-bold"
                  type="button"
                  onClick={handleNewBill}
                  title="Start a new bill"
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  New Bill
                </button>
              </div>
            )}
            {/* Category selector — top of items panel */}
            <div className={styles.categorySection}>
              <Suspense fallback={
                <div className="text-center py-1">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span className="small">Loading categories...</span>
                </div>
              }>
                <Categories
                  categories={categories}
                  selectedCategoryId={(selectedCategory as { id: string } | null)?.id ?? null}
                  billingMode={true}
                  expanded={categoryGridExpanded}
                  onToggleExpand={() => setCategoryGridExpanded(v => !v)}
                  fetchError={fetchCategoryError}
                  showHeader={false}
                  onAllClick={() => {
                    setCategoryGridExpanded(false);
                    setSelectedCategory(null);
                    setShowingTopItems(true);
                    fetchTopItems();
                  }}
                  onCategoryClick={(category) => {
                    setCategoryGridExpanded(false);
                    if (createdBill) resetForNewBill();
                    setShowingTopItems(false);
                    setSelectedCategory(category);
                    const noInFlightSelections = selectedItems.length === 0;
                    fetchItems(category.id, { preferCache: noInFlightSelections });
                  }}
                  onDeleteCategory={undefined}
                />
              </Suspense>
            </div>

            <div className={`card-body p-0 ${styles.panelCardBody}`}>
              <ErrorDisplay
                error={itemError}
                onDismiss={() => setItemError("")}
              />
              <ErrorDisplay
                error={errorDetails?.message || null}
                errorDetails={errorDetails}
                onDismiss={() => setErrorDetails(null)}
              />
              {(showingTopItems || selectedCategory) && (
                <div className="px-3 pt-2 pb-0">
                  <small className="text-muted fw-semibold">
                    {showingTopItems ? (
                      <><i className="bi bi-star-fill me-1 text-warning"></i>Top Selling Items</>
                    ) : (
                      <><i className="bi bi-tag me-1"></i>{(selectedCategory as any)?.name}</>
                    )}
                  </small>
                </div>
              )}
              <Suspense fallback={
                <div className="text-center p-4">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span>Loading items...</span>
                </div>
              }>
                <ViewItems
                  selectedCategory={selectedCategory}
                  items={items}
                  itemError={itemError}
                  setItems={setItems}
                  isBillingSection={true}
                  isPricelistSection={false}
                  isCategoryItemsSection={false}
                  onItemPick={createdBill ? undefined : handlePickItem}
                  itemInventory={itemInventory}
                  selectedItems={selectedItems}
                  onExpandedChange={setHasExpandedItems}
                  missingConstituents={missingConstituents}
                  onItemUpdated={() => {
                    if (selectedCategory) {
                      fetchItems(selectedCategory.id);
                    }
                  }}
                />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Current Bill Section */}
        <div className={styles.panel}>
          <div className={`card border-0 shadow-sm ${styles.panelCard}`}>
            <div className="card-header bg-light border-bottom py-2">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0 fw-bold text-dark">
                  <i className="bi bi-receipt me-2 text-success"></i>
                  Current Bill
                </h6>
                <div className="d-flex align-items-center gap-3">
                  <small className="text-muted">
                    {(createdBill ? createdBill.bill_items : selectedItems).length} items
                  </small>
                  {createdBill && (
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-success text-white fw-bold">
                        #{createdBill.id}
                      </span>
                      {createdBill.tags && (() => {
                        try {
                          const tags: string[] = JSON.parse(createdBill.tags);
                          return tags.length > 0 ? (
                            <span className="badge bg-primary text-white">
                              <i className="bi bi-person me-1"></i>{tags[0]}
                            </span>
                          ) : null;
                        } catch { return null; }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className={`card-body p-3 ${styles.billCardBody}`}>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="fw-bold">Item</th>
                      <th className="text-center fw-bold">Qty</th>
                      <th className="text-end fw-bold">Price</th>
                      <th className="text-center fw-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(createdBill ? createdBill.bill_items : selectedItems).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-5">
                          <i className="bi bi-cart-x fs-1 d-block mb-2 text-muted"></i>
                          <span className="fw-medium">No items in bill</span>
                        </td>
                      </tr>
                    ) : (
                      (createdBill ? createdBill.bill_items : selectedItems).map((item) => (
                        <tr key={item.id} className="align-middle">
                          <td className="fw-medium">{item.item?.name || item.name}</td>
                          <td className="text-center">
                            <span className="badge bg-primary rounded-pill px-2 py-1">{item.quantity}</span>
                          </td>
                          <td className="text-end fw-bold text-success">
                            ${((Number(item.subtotal) || 0) || ((Number(item.price) || 0) * (Number(item.quantity) || 0))).toFixed(2)}
                          </td>
                          <td className="text-center">
                            {!createdBill && (
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove item"
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-footer bg-light border-top py-3" style={{ boxShadow: "0 -2px 4px rgba(0,0,0,0.05)" }}>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <div className="d-flex flex-column">
                    <div className="h4 mb-1 fw-bold text-success">
                      Total: ${createdBill && !isNaN(Number(createdBill.total))
                        ? (Number(createdBill.total) || 0).toFixed(2)
                        : (Number(totalAmount) || 0).toFixed(2)
                      }
                    </div>
                    {waitress && (
                      <small className="text-muted">
                        <i className="bi bi-person me-1"></i>
                        Served by: {waitress}
                      </small>
                    )}
                  </div>
                </div>
                <div>
                  <div className="d-flex flex-wrap gap-2 justify-content-end">
                    {!createdBill ? (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={handleShowSubmitModal}
                          disabled={selectedItems.length === 0 || !currentStation || isSubmitting}
                          className="px-3 fw-bold"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check-circle me-1"></i>
                              Create Bill
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={handleShowCancelModal}
                          disabled={selectedItems.length === 0 || isSubmitting}
                          className="fw-bold px-3"
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Clear
                        </Button>
                      </>
                    ) : (
                      <>
                        {!billAutoSettled && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowCollectPaymentModal(true)}
                            className="fw-bold px-3"
                          >
                            <i className="bi bi-cash-coin me-1"></i>
                            Collect Payment
                          </Button>
                        )}
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={handleNewBill}
                          className="fw-bold px-3"
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          New Bill
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={handlePrint}
                          className="fw-medium px-3"
                        >
                          <i className="bi bi-printer me-1"></i>
                          Print
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={handleDownload}
                          className="fw-medium px-3"
                        >
                          <i className="bi bi-download me-1"></i>
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Receipt Component */}
      <div style={{ display: "none" }}>
        {createdBill && <ReceiptPrint ref={receiptRef} bill={createdBill} showTax={showTax} showPaymentMode={showPaymentMode} receiptBranding={receiptBranding} />}
      </div>

      {/* Quantity Modal */}
      <QuantityModal
        key={currentItem ? String(currentItem.id) : "qty-modal"}
        item={showQuantityModal ? currentItem : null}
        onClose={() => {
          setShowQuantityModal(false);
          setCurrentItem(null);
        }}
        onConfirm={handleQuantityConfirm}
        availableQuantity={currentItem ? itemInventory[currentItem.id] : undefined}
        alreadyInBill={
          currentItem
            ? selectedItems.find(i => i.id === currentItem.id)?.quantity || 0
            : 0
        }
      />

      <Suspense fallback={null}>
        <CategoryDeleteModal
          show={Boolean(showCategoryDeleteModal && categoryToDelete)}
          categoryName={categoryToDelete?.name ?? ""}
          onCancel={() => {
            setShowCategoryDeleteModal(false);
            setCategoryToDelete(null);
            setCategoryDeleteError(null);
            setCategoryDeleteErrorDetails(null);
          }}
          onConfirm={handleConfirmBillingCategoryDelete}
        />
      </Suspense>
      {categoryDeleteError && (
        <div className="position-fixed bottom-0 start-0 end-0 p-3" style={{ zIndex: 1080 }}>
          <ErrorDisplay
            error={categoryDeleteError}
            errorDetails={categoryDeleteErrorDetails}
            onDismiss={() => {
              setCategoryDeleteError(null);
              setCategoryDeleteErrorDetails(null);
            }}
          />
        </div>
      )}

      {/* Submit Confirmation Modal - Simple Bill Creation */}
      <Modal show={showSubmitModal} onHide={handleCloseSubmitModal} size="lg" centered backdrop="static" keyboard={false} dialogClassName="submit-bill-modal-dialog">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="fw-bold">
            Confirm create bill: KES {(Number(totalAmount) || 0).toFixed(2)}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <Row className="g-3 flex-lg-nowrap align-items-start">
            <Col lg={mpesaSettled && !cashSettled ? 6 : 12}>
              <ErrorDisplay
                error={billError}
                errorDetails={errorDetails}
                onDismiss={() => {
                  setBillError("");
                  setErrorDetails(null);
                }}
              />
              <div className="text-center">
                {isSubmitting ? (
                  <>
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="fs-5 text-primary">
                      {cashSettled && !mpesaSettled
                        ? "Creating & settling bill (Cash)..."
                        : mpesaSettled && !cashSettled
                        ? "Creating & settling bill (M-Pesa)..."
                        : "Creating bill..."}
                    </p>
                    <p className="text-muted">Please wait while we process your order</p>
                  </>
                ) : (
                  <>
                    <i className="bi bi-receipt fs-1 text-primary mb-3 d-block"></i>
                    <h3 className="text-success fw-bold">KES {(Number(totalAmount) || 0).toFixed(2)}</h3>
                  </>
                )}
              </div>
              <div className="mt-4 pt-3 border-top">
                {/* Payment Method Selector */}
                <div className="fw-semibold fs-6 mb-2 text-muted">Payment Method</div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    data-testid="payment-method-later"
                    className={`btn flex-fill py-3 d-flex flex-column align-items-center gap-1 ${!cashSettled && !mpesaSettled ? "btn-secondary" : "btn-outline-secondary"}`}
                    onClick={() => { setCashSettled(false); setMpesaSettled(false); setMpesaRef(""); }}
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-hourglass fs-5"></i>
                    <span className="small fw-semibold">Pay Later</span>
                  </button>
                  <button
                    type="button"
                    data-testid="payment-method-cash"
                    className={`btn flex-fill py-3 d-flex flex-column align-items-center gap-1 ${cashSettled ? "btn-success" : "btn-outline-success"}`}
                    onClick={() => { setCashSettled(true); setMpesaSettled(false); setMpesaRef(""); }}
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-cash-coin fs-5"></i>
                    <span className="small fw-semibold">Cash</span>
                  </button>
                  <button
                    type="button"
                    data-testid="payment-method-mpesa"
                    className={`btn flex-fill py-3 d-flex flex-column align-items-center gap-1 ${mpesaSettled ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => { setMpesaSettled(true); setCashSettled(false); }}
                    disabled={isSubmitting}
                  >
                    <i className="bi bi-phone fs-5"></i>
                    <span className="small fw-semibold">M-Pesa</span>
                  </button>
                </div>

                {/* M-Pesa Reference Input */}
                {mpesaSettled && !cashSettled && (
                  <div className="mt-2">
                    <div className="position-relative">
                      <input
                        type="text"
                        className={`form-control${mpesaRefValidationError && mpesaRef.trim() ? " is-invalid" : mpesaRef.trim() && !isValidatingMpesaRef && !mpesaRefValidationError ? " is-valid" : ""}`}
                        placeholder="M-Pesa reference (e.g. QRM123456789)"
                        value={mpesaRef}
                        onChange={(e) => setMpesaRef(e.target.value.toUpperCase())}
                        disabled={isSubmitting}
                        autoComplete="off"
                        spellCheck={false}
                        style={{ fontSize: "1rem", padding: "0.6rem 0.75rem", letterSpacing: "0.04em" }}
                      />
                      {isValidatingMpesaRef && (
                        <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                          <Spinner animation="border" size="sm" />
                        </div>
                      )}
                    </div>
                    {!mpesaRef.trim() && (
                      <div className="text-muted small mt-1">
                        <i className="bi bi-info-circle me-1"></i>
                        Reference required to auto-settle via M-Pesa
                      </div>
                    )}
                    {mpesaRefValidationError && (
                      <div className="invalid-feedback d-block">{mpesaRefValidationError}</div>
                    )}
                  </div>
                )}

                {/* Status alerts */}
                {cashSettled && !mpesaSettled && (
                  <div className="mt-2 alert alert-success py-2 px-3 mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-cash-coin fs-5"></i>
                    <span className="fw-medium">KES {(Number(totalAmount) || 0).toFixed(2)} will be recorded as cash payment</span>
                  </div>
                )}
                {mpesaSettled && !cashSettled && mpesaRef.trim() && !mpesaRefValidationError && !isValidatingMpesaRef && (
                  <div className="mt-2 alert alert-success py-2 px-3 mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-phone fs-5"></i>
                    <span className="fw-medium">KES {(Number(totalAmount) || 0).toFixed(2)} M-Pesa — Ref: {mpesaRef.trim()}</span>
                  </div>
                )}

                {/* Sales Rep Labels */}
                {billTags.length > 0 && (
                  <div className="mt-3 pt-3 border-top">
                    <div className="fw-semibold fs-6 mb-2">Sales Rep</div>
                    <div className="d-flex flex-wrap gap-2">
                      {billTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className={`btn btn-sm ${selectedTag === tag.name ? `btn-${tag.color}` : `btn-outline-${tag.color}`}`}
                          onClick={() => setSelectedTag(selectedTag === tag.name ? "" : tag.name)}
                          disabled={isSubmitting}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Note */}
                <div className={`${billTags.length > 0 ? "mt-3" : "mt-3 pt-3 border-top"}`}>
                  <div className="fw-semibold fs-6 mb-1">Additional note <span className="fw-normal text-muted">(optional)</span></div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. For table 5, delivery order…"
                    value={billNote}
                    onChange={(e) => setBillNote(e.target.value)}
                    disabled={isSubmitting}
                    maxLength={255}
                  />
                </div>
              </div>
            </Col>
            {mpesaSettled && !cashSettled && (
              <Col lg={6} className="ps-lg-2">
                <div className="sticky-lg-top" style={{ top: 4 }}>
                  <SubmitBillVirtualKeyboard
                    mode="alpha"
                    alphaSpacing="comfortable"
                    alphaHeading="M-Pesa Reference"
                    defaultCapsLock
                    onCharacter={handleMpesaRefCharacter}
                    onSpecialKey={handleMpesaRefSpecialKey}
                  />
                </div>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            variant="outline-secondary"
            onClick={handleCloseSubmitModal}
            className="fw-medium"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleConfirmSubmit}
            className="fw-medium"
            disabled={isSubmitting || (mpesaSettled && !cashSettled && (!mpesaRef.trim() || !!mpesaRefValidationError || isValidatingMpesaRef))}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {cashSettled && !mpesaSettled
                  ? "Creating & settling (Cash)..."
                  : mpesaSettled && !cashSettled
                  ? "Creating & settling (M-Pesa)..."
                  : "Creating..."}
              </>
            ) : cashSettled && !mpesaSettled ? (
              <>
                <i className="bi bi-cash-coin me-1"></i>
                Create &amp; Settle (Cash)
              </>
            ) : mpesaSettled && !cashSettled ? (
              <>
                <i className="bi bi-phone me-1"></i>
                Create &amp; Settle (M-Pesa)
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-1"></i>
                Create Bill
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal show={showCancelModal} onHide={handleCloseCancelModal} centered backdrop="static" keyboard={false}>
        <Modal.Header closeButton className="bg-warning text-dark">
          <Modal.Title className="fw-bold">Cancel Billing</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <div className="text-center">
            <i className="bi bi-exclamation-triangle fs-1 text-warning mb-3 d-block"></i>
            <p className="fs-5">Are you sure you want to clear all items from the bill?</p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={handleCloseCancelModal} className="fw-medium">
            No, Keep Items
          </Button>
          <Button variant="danger" onClick={handleConfirmCancel} className="fw-medium">
            <i className="bi bi-trash me-1"></i>
            Yes, Clear All
          </Button>
        </Modal.Footer>
      </Modal>

      <SubmitBillModal
        show={showCollectPaymentModal}
        onHide={() => setShowCollectPaymentModal(false)}
        selectedBill={createdBill}
        onBillSubmitted={() => {
          setShowCollectPaymentModal(false);
          resetForNewBill();
        }}
      />
    </div>
  );
};

export default BillingSection;
