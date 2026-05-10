"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
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
import ReactDOM from "react-dom/client";
import { useStation } from "../contexts/StationContext";
import { usePricelist } from "../contexts/PricelistContext";
import { useAuth } from "../contexts/AuthContext";
import ErrorDisplay from "../components/ErrorDisplay";
import StationSelector from "../components/StationSelector";
import PricelistSwitcher from "../components/PricelistSwitcher";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import { hasPermission } from "../../backend/config/role-permissions";
import { fireCashSettle } from "../utils/billCashSettle";

const INVENTORY_TTL_MS = 15000;

const BillingSection = () => {
  const pathname = usePathname();
  // Auth context
  const { isAuthenticated, logout, user, isLoading: authLoading } = useAuth();

  // Station context
  const { currentStation, isLoading: stationLoading, error: stationError, loadStationsIfNeeded } = useStation();

  // Pricelist context
  const { currentPricelist, isLoading: pricelistLoading, error: pricelistError, loadPricelistsIfNeeded } = usePricelist();

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
  const [createdBill, setCreatedBill] = useState(null);
  const [billError, setBillError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoriesFetched, setCategoriesFetched] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [itemInventory, setItemInventory] = useState<Record<number, number>>({});
  const [missingConstituents, setMissingConstituents] = useState<Record<number, Array<{ itemId: number; itemName: string; available: number; required: number }>>>({});
  const [hasExpandedItems, setHasExpandedItems] = useState<boolean>(false);
  const [showAvailableItemsHeader, setShowAvailableItemsHeader] = useState<boolean>(false);
  const inventoryRefreshInFlightRef = useRef<string | null>(null);
  const inventorySnapshotRef = useRef<Record<number, number>>({});
  const inventoryFetchedAtRef = useRef<Record<number, number>>({});
  const visibleItemIdsRef = useRef<number[]>([]);

  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showCategoryDeleteModal, setShowCategoryDeleteModal] = useState(false);
  const [categoryDeleteError, setCategoryDeleteError] = useState<string | null>(null);
  const [categoryDeleteErrorDetails, setCategoryDeleteErrorDetails] = useState<ApiErrorResponse | null>(null);

  const userRoleNames = useMemo(
    () => (user?.roles || []).map((r: { name?: string } | string) => (typeof r === "string" ? r : r?.name)).filter(Boolean) as string[],
    [user?.roles],
  );
  const canDeleteCategoryOnBill = hasPermission(userRoleNames, "can_delete_category");

  /** When true, print customer + captain (2 jobs) after creating a pending bill from billing. Cashier close bill never prints; My Sales Print is customer copy only. */
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const [autoPrintPrinterName, setAutoPrintPrinterName] = useState("");
  const [autoPrintCopyMode, setAutoPrintCopyMode] = useState<"customer" | "kitchen" | "both">("both");
  const [showTax, setShowTax] = useState(true);
  const [receiptBranding, setReceiptBranding] = useState<ReceiptBranding>(() => defaultReceiptBranding());

  /** While a pending bill is open, exclude it from pending-demand so totals match server validation. */
  const pendingBillExcludeIdRef = useRef<number | undefined>(undefined);

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
    } else if (!selectedCategory) {
      // Clear items when no category is selected
      setItems([]);
    }
  }, [currentPricelist?.id, selectedCategory?.id, fetchItems]); // Include fetchItems in dependencies

  // Reset preload state when pricelist changes
  useEffect(() => {
    setItemsPreloaded(false);
    setAllPricelistItems([]);
    setItems([]);
  }, [currentPricelist?.id]);

  const handlePickItem = useCallback((item: Item) => {
    if (!item.price) {
      return;
    }

    // Check available inventory before allowing pick
    const available = itemInventory[item.id] ?? 0;
    const alreadyInBill = selectedItems.find(i => i.id === item.id);
    const alreadyReserved = alreadyInBill ? alreadyInBill.quantity : 0;
    const availableAfterReserved = available - alreadyReserved;

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

  const openBillingCategoryDelete = useCallback((category: { id: string; name: string }) => {
    setCategoryDeleteError(null);
    setCategoryDeleteErrorDetails(null);
    setCategoryToDelete(category);
    setShowCategoryDeleteModal(true);
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
  }, []);
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
            `create-bill: HTTP 201 billId=${newBillId ?? "?"} items=${selectedItems.length} total=${total} autoPrintEnabled=${autoPrintEnabled} cashSettled=${cashSettled}`,
          );

          if (cashSettled && newBillId) {
            fireCashSettle(apiCall as Parameters<typeof fireCashSettle>[0], newBillId, total);
            logClientFromRenderer(`create-bill: auto-settle fired (fire-and-forget) billId=${newBillId}`);
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
          };
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
                  { showTax, receiptBranding }
                );
                if (!customerPrint.success) {
                  logClientFromRenderer(
                    `create-bill: auto-print finished with errors billId=${billForReceipt.id} customer=${customerPrint.success}`,
                    "WARN",
                  );
                } else {
                  logClientFromRenderer(`create-bill: auto-print finished OK billId=${billForReceipt.id} mode=customer`);
                }
              } else if (autoPrintCopyMode === "kitchen") {
                const captainPrint = await printCaptainCopyOnly(
                  billForReceipt,
                  autoPrintPrinterName || undefined,
                  { showTax, receiptBranding }
                );
                if (!captainPrint.success) {
                  logClientFromRenderer(
                    `create-bill: auto-print finished with errors billId=${billForReceipt.id} captain=${captainPrint.success}`,
                    "WARN",
                  );
                } else {
                  logClientFromRenderer(`create-bill: auto-print finished OK billId=${billForReceipt.id} mode=kitchen`);
                }
              } else {
                const { captain: captainPrint, customer: customerPrint } = await printCaptainOrderAndCustomerCopy(
                  billForReceipt,
                  autoPrintPrinterName || undefined,
                  { showTax, receiptBranding }
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
            })();
          } else {
            logClientFromRenderer(`create-bill: auto-print skipped (disabled) billId=${billForReceipt.id}`);
            resetForNewBill();
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
    logClientFromRenderer(`print: manual pending bill (billing) customer+captain billId=${createdBill.id}`);
    await printCaptainOrderAndCustomerCopy(createdBill, undefined, { showTax, receiptBranding });
  };

  const handleDownload = async () => {
    if (!createdBill) return;

    // Download Customer Copy
    await downloadReceiptAsFile(CustomerCopyPrint, createdBill, "customer", { showTax, receiptBranding });
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
  }, []);

  const handleNewBill = useCallback(() => {
    resetForNewBill();
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
          <StationSelector />
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
    <div className="container-fluid p-0 billing-screen">
      {/* Main Content - Improved Layout */}
      <div className="row g-1">
        {/* Available Items Section */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100 items-section">
            {showAvailableItemsHeader ? (
              <div className="card-header bg-primary text-white py-2">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <h6 className="mb-0 fw-bold">
                    <i className="bi bi-box-seam me-2"></i>
                    Available Items
                  </h6>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <small className="text-white-50">
                      {items.length} items
                    </small>
                    <span className="badge bg-light text-dark px-2 py-1">
                      <i className="bi bi-building me-1"></i>
                      Station: {currentStation?.name || "Station"}
                    </span>
                    <PricelistSwitcher
                      size="sm"
                      showLabel={false}
                      onPricelistChange={() => {
                        // Refetch items when pricelist changes
                        if (selectedCategory) {
                          fetchItems(selectedCategory.id);
                        }
                      }}
                    />
                    {createdBill && (
                      <button
                        className="btn btn-sm btn-warning text-dark fw-bold"
                        type="button"
                        onClick={handleNewBill}
                        title="Start a new bill"
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        New Bill
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-outline-light"
                      type="button"
                      onClick={() => setShowAvailableItemsHeader(false)}
                      title="Hide header"
                    >
                      <i className="bi bi-chevron-up"></i>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-header bg-light border-bottom py-1 px-2">
                <button
                  className="btn btn-sm btn-link text-primary p-0"
                  type="button"
                  onClick={() => setShowAvailableItemsHeader(true)}
                  title="Show header"
                >
                  <i className="bi bi-chevron-down me-1"></i>
                  <small>Show Station & Pricelist</small>
                </button>
              </div>
            )}
            <div className="card-body p-0">
              <ErrorDisplay
                error={itemError}
                onDismiss={() => setItemError("")}
              />
              <ErrorDisplay
                error={errorDetails?.message || null}
                errorDetails={errorDetails}
                onDismiss={() => setErrorDetails(null)}
              />
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

        {/* Billing Section - Improved */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100 bill-section">
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
                    <span className="badge bg-success text-white fw-bold">
                      #{createdBill.id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body p-3 billing-current-bill-body">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light sticky-top">
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
              <div className="row align-items-center g-3">
                <div className="col-md-6">
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
                <div className="col-md-6">
                  <div className="d-flex flex-wrap gap-2 justify-content-md-end">
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
                        <Button
                          variant="success"
                          size="sm"
                          onClick={handleNewBill}
                          className="fw-bold px-3"
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          New Bill
                        </Button>
                        <Button
                          variant="outline-primary"
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
                          Download
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

      {/* Categories Section - Compact */}
      <div className={`row mt-1 categories-section ${hasExpandedItems ? "categories-section-expanded" : ""}`}>
        <div className="col-12">
          <div className={`card border-0 shadow-sm categories-card ${hasExpandedItems ? "categories-card-expanded" : ""}`}>
            <div className="card-body py-2 px-3">
              <Suspense fallback={
                <div className="text-center p-2">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span>Loading categories...</span>
                </div>
              }>
                <Categories
                  categories={categories}
                  onCategoryClick={(category) => {
                    // Treat category switch as "start new bill" when no active bill is available.
                    if (createdBill) {
                      resetForNewBill();
                    }
                    setSelectedCategory(category);
                    const noInFlightSelections = selectedItems.length === 0;
                    fetchItems(category.id, { preferCache: noInFlightSelections });
                  }}
                  onDeleteCategory={canDeleteCategoryOnBill ? openBillingCategoryDelete : undefined}
                  fetchError={fetchCategoryError}
                  showHeader={false}
                  billingMode={true}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Receipt Component */}
      <div style={{ display: "none" }}>
        {createdBill && <ReceiptPrint ref={receiptRef} bill={createdBill} showTax={showTax} receiptBranding={receiptBranding} />}
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
      <Modal show={showSubmitModal} onHide={handleCloseSubmitModal} centered backdrop="static" keyboard={false}>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="fw-bold">
            Confirm create bill: KES {(Number(totalAmount) || 0).toFixed(2)}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
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
                <p className="fs-5 text-primary">{cashSettled ? "Creating & settling bill..." : "Creating bill..."}</p>
                <p className="text-muted">{cashSettled ? "Please wait while we process and settle your order" : "Please wait while we process your order"}</p>
              </>
            ) : (
              <>
                <i className="bi bi-receipt fs-1 text-primary mb-3 d-block"></i>
                <h3 className="text-success fw-bold">KES {(Number(totalAmount) || 0).toFixed(2)}</h3>
              </>
            )}
          </div>
          <div className="mt-4 pt-3 border-top">
            <div className="d-flex align-items-center justify-content-between gap-3">
              <div>
                <div className="fw-semibold fs-6">Cash Settled</div>
                <div className="text-muted small">Bill will be automatically submitted with cash payment</div>
              </div>
              <div className="form-check form-switch m-0" style={{ transform: "scale(1.6)", transformOrigin: "right center" }}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="cashSettledToggle"
                  checked={cashSettled}
                  onChange={(e) => setCashSettled(e.target.checked)}
                  disabled={isSubmitting}
                  style={{ cursor: "pointer" }}
                />
              </div>
            </div>
            {cashSettled && (
              <div className="mt-2 alert alert-success py-2 px-3 mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-cash-coin fs-5"></i>
                <span className="fw-medium">KES {(Number(totalAmount) || 0).toFixed(2)} will be recorded as cash payment</span>
              </div>
            )}
          </div>
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
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {cashSettled ? "Creating & settling..." : "Creating..."}
              </>
            ) : cashSettled ? (
              <>
                <i className="bi bi-cash-coin me-1"></i>
                Create &amp; Settle Bill
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
    </div>
  );
};

export default BillingSection;
