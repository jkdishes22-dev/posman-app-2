import { Bill, BillStatus } from "@entities/Bill";
import { BillItem, BillItemStatus } from "@entities/BillItem";
import { Item } from "@entities/Item";
import { User } from "@entities/User";
import { Station } from "@entities/Station";
import { AppDataSource } from "@backend/config/data-source";
import { UserService } from "./UserService";
import { BillPaymentInterface } from "@backend/interfaces/BillPayment";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getAppTimezone } from "@backend/config/timezone";
import { BillPayment } from "@backend/entities/BillPayment";
import { Payment, PaymentType } from "@backend/entities/Payment";
import { InventoryService } from "./InventoryService";
import { NotificationService } from "./NotificationService";
import { Service } from "typedi";
import { DataSource, EntityNotFoundError, Repository } from "typeorm";

export type BillFilter = {
  targetDate?: Date;
  startDate?: Date;
  endDate?: Date;
  status?: string | string[];
  billId?: string | string[];
  billingUserId?: string | string[]
};

@Service()
export class BillService {
  private billRepository: Repository<Bill>;
  private billItemRepository: Repository<BillItem>;
  private paymentRepository: Repository<Payment>;
  private billPaymentRepository: Repository<BillPayment>;

  private userService: UserService;
  private inventoryService: InventoryService;
  private notificationService: NotificationService;

  private normalizePaymentReference(reference: string | null | undefined): string | null {
    if (!reference) {
      return null;
    }
    const normalized = reference.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  constructor(dataSource: DataSource) {
    this.billRepository = dataSource.getRepository(Bill);
    this.billItemRepository = dataSource.getRepository(BillItem);
    this.paymentRepository = dataSource.getRepository(Payment);
    this.billPaymentRepository = dataSource.getRepository(BillPayment);

    this.userService = new UserService(dataSource);
    this.inventoryService = new InventoryService(dataSource);
    this.notificationService = new NotificationService();
  }

  async createBill(payload) {
    const { items, total, user_id, station_id, request_id } = payload;

    // Validate inventory availability BEFORE creating the bill
    // Use the same logic as the frontend availability check
    const itemIds = items.map((item: any) => item.item_id);
    const availableInventory = await this.inventoryService.getAvailableInventoryForItems(itemIds, false);

    // Batch load all items to check allowNegativeInventory flags
    const itemRepository = this.billRepository.manager.getRepository(Item);
    const itemEntities = await itemRepository.find({
      where: itemIds.map(id => ({ id })),
    });
    const itemsMap = new Map<number, Item>();
    for (const itemEntity of itemEntities) {
      itemsMap.set(itemEntity.id, itemEntity);
    }

    // Check each item's availability (respect allowNegativeInventory flag)
    for (const item of items) {
      const itemEntity = itemsMap.get(item.item_id);
      const allowNegative = Boolean(itemEntity?.allowNegativeInventory) || Number(itemEntity?.allowNegativeInventory) === 1;

      // Skip validation for items that allow negative inventory
      if (allowNegative) {
        continue;
      }

      const available = availableInventory.get(item.item_id) || 0;
      const requestedQuantity = item.quantity;

      if (available < requestedQuantity) {
        const itemName = itemEntity?.name || `Item ${item.item_id}`;

        throw new Error(
          `Insufficient inventory for ${itemName}. ` +
          `Available: ${available}, Requested: ${requestedQuantity}. ` +
          `Please issue more ${itemName} to inventory before adding to bill.`
        );
      }
    }

    // Create bill in transaction
    const completeBill = await this.billRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Check for idempotency - if request_id is provided, check if bill already exists
        if (request_id) {
          const existingBill = await transactionalEntityManager.findOne(Bill, {
            where: { request_id },
            relations: ["bill_items", "bill_items.item", "user", "station"]
          });

          if (existingBill) {
            // Return existing bill for idempotency
            return existingBill;
          }
        }

        const newBill = await transactionalEntityManager.save(Bill, {
          user: { id: user_id },
          station: station_id ? { id: station_id } : undefined,
          total,
          status: BillStatus.PENDING,
          created_by: user_id,
          request_id: request_id || null,
        });

        const billItems = items.map((item) => ({
          item: { id: item.item_id },
          bill: { id: newBill.id },
          quantity: item.quantity,
          subtotal: item.subtotal,
          status: BillItemStatus.PENDING,
        }));

        const savedBillItems = await transactionalEntityManager.save(BillItem, billItems);

        // Load relations efficiently - fetch user and station in parallel
        const [userEntity, stationEntity] = await Promise.all([
          transactionalEntityManager.findOne(User, { where: { id: user_id } }),
          station_id ? transactionalEntityManager.findOne(Station, { where: { id: station_id } }) : Promise.resolve(null)
        ]);

        // Load item entities for bill items
        const itemIds = savedBillItems.map(bi => bi.item_id).filter(id => id != null);
        const itemEntities = itemIds.length > 0
          ? await transactionalEntityManager.find(Item, { where: itemIds.map(id => ({ id })) })
          : [];
        const itemsMap = new Map(itemEntities.map(item => [item.id, item]));

        // Construct bill object with relations instead of fetching
        const bill = {
          ...newBill,
          bill_items: savedBillItems.map(bi => ({
            ...bi,
            item: itemsMap.get(bi.item_id) || null
          })),
          user: userEntity,
          station: stationEntity
        };

        return bill as Bill;
      },
    );

    InventoryService.invalidateInventoryCache();
    return completeBill;
  }

  async fetchBills(userId: number, billFilter: BillFilter, page = 1, pageSize = 20) {
    const { targetDate, startDate, endDate, status, billId, billingUserId } = billFilter;
    const appTimezone = getAppTimezone();
    let startOfDayDate, endOfDayDate;

    if (targetDate) {
      // Single-date filter (backward compat for cashier page) — full day range in local timezone.
      const localDate = toZonedTime(targetDate, appTimezone);
      startOfDayDate = fromZonedTime(startOfDay(localDate), appTimezone);
      endOfDayDate = fromZonedTime(endOfDay(localDate), appTimezone);
    } else if (startDate || endDate) {
      // Date range filter: convert each boundary to local-timezone midnight / end-of-day.
      if (startDate) {
        const local = toZonedTime(startDate, appTimezone);
        startOfDayDate = fromZonedTime(startOfDay(local), appTimezone);
      }
      if (endDate) {
        const local = toZonedTime(endDate, appTimezone);
        endOfDayDate = fromZonedTime(endOfDay(local), appTimezone);
      }
    }

    // Optimize: Only fetch user if we need role check (not needed for single billId query)
    let includeBills = false;
    if (!billId) {
      const currentUser = await this.userService.getUserById(userId);
      const roleNames = ["user", "waitress"];
      includeBills = currentUser.roles.some((role) =>
        roleNames.includes(role.name),
      );
    }

    try {
      const query = this.billRepository
        .createQueryBuilder("bill")
        .leftJoinAndSelect("bill.bill_items", "billItem")
        .leftJoinAndSelect("billItem.item", "item")
        .leftJoinAndSelect("bill.bill_payments", "billPayment")
        .leftJoinAndSelect("billPayment.payment", "payment")
        .leftJoinAndSelect("bill.user", "user")
        .leftJoinAndSelect("bill.station", "station");

      if (startOfDayDate && endOfDayDate) {
        query.where("bill.created_at BETWEEN :start AND :end", {
          start: startOfDayDate,
          end: endOfDayDate,
        });
      } else if (startOfDayDate) {
        query.where("bill.created_at >= :start", { start: startOfDayDate });
      } else if (endOfDayDate) {
        query.where("bill.created_at <= :end", { end: endOfDayDate });
      }

      if (status) {
        query.andWhere("bill.status = :status", { status });
      }

      if (billId) {
        query.andWhere("bill.id = :billId", { billId });
      }

      // If billingUserId is provided, use it (takes precedence for filtering by specific waitress)
      // Otherwise, if user is a regular user/waitress, restrict to their own bills
      if (billingUserId) {
        query.andWhere("bill.user_id = :billingUserId", { billingUserId });
      } else if (userId && includeBills) {
        query.andWhere("bill.user_id = :userId", { userId });
      }

      // Add consistent ordering for pagination
      query.orderBy("bill.created_at", "DESC");

      // Optimize: Skip count query when fetching by billId (we know it's 1 or 0)
      let total = 0;
      if (billId) {
        // For single bill fetch, we don't need count - just check if bill exists
        total = 1; // Will be adjusted if no bill found
      } else {
        // Get total count before pagination (clone the query for count)
        // Optimize: Use a simpler count query without joins
        const countQuery = this.billRepository
          .createQueryBuilder("bill")
          .select("COUNT(DISTINCT bill.id)", "count");

        if (startOfDayDate && endOfDayDate) {
          countQuery.where("bill.created_at BETWEEN :start AND :end", {
            start: startOfDayDate,
            end: endOfDayDate,
          });
        } else if (startOfDayDate) {
          countQuery.where("bill.created_at >= :start", { start: startOfDayDate });
        } else if (endOfDayDate) {
          countQuery.where("bill.created_at <= :end", { end: endOfDayDate });
        }

        if (status) {
          countQuery.andWhere("bill.status = :status", { status });
        }

        // If billingUserId is provided, use it (takes precedence for filtering by specific waitress)
        // Otherwise, if user is a regular user/waitress, restrict to their own bills
        if (billingUserId) {
          countQuery.andWhere("bill.user_id = :billingUserId", { billingUserId });
        } else if (userId && includeBills) {
          countQuery.andWhere("bill.user_id = :userId", { userId });
        }

        const countResult = await countQuery.getRawOne();
        total = parseInt(countResult?.count || "0", 10);
      }

      // Apply pagination to the original query
      query.skip((page - 1) * pageSize).take(pageSize);

      const bills = await query.getMany();

      // Optimize: Only fetch prices if we have bills and items
      const billItemIds = bills.flatMap(bill =>
        bill.bill_items?.map(item => item.id) || []
      );

      let itemPrices = {};
      if (billItemIds.length > 0) {
        // Optimize: Use IN clause with proper indexing
        const priceQuery = this.billItemRepository
          .createQueryBuilder("billItem")
          .leftJoin("pricelist_item", "pi", "pi.item_id = billItem.item_id AND pi.is_enabled = 1")
          .select([
            "billItem.id as billItemId",
            "COALESCE(pi.price, 0) as price"
          ])
          .where("billItem.id IN (:...billItemIds)", { billItemIds });

        const priceResults = await priceQuery.getRawMany();
        itemPrices = priceResults.reduce((acc, result) => {
          acc[result.billItemId] = parseFloat(result.price) || 0;
          return acc;
        }, {});
      }

      // Transform bills to include item prices
      const transformedBills = bills.map(bill => ({
        ...bill,
        bill_items: bill.bill_items?.map(item => {
          const itemPrice = itemPrices[item.id] || 0;
          return {
            ...item,
            item: {
              ...item.item,
              price: itemPrice
            }
          };
        }) || []
      }));

      // Adjust total if billId query returned no results
      if (billId && transformedBills.length === 0) {
        total = 0;
      }

      return { bills: transformedBills, total };
    } catch (error) {
      console.error("Error fetching bills:", error);
      throw error;
    }
  }

  async cancelBill(billId: number, userId?: number) {
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ["bill_items", "bill_items.item"]
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    bill.status = BillStatus.CANCELLED;
    if (userId) {
      bill.updated_by = userId;
    }
    const saved = await this.billRepository.save(bill);
    InventoryService.invalidateInventoryCache();
    return saved;
  }

  // Request void for a specific item (Rule 4.3, 4.5)
  async requestVoidItem(
    billId: number,
    itemId: number,
    requestedBy: number,
    reason: string
  ) {
    // Validate business rules (Rule 4.8)
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ["bill_items"]
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    if (bill.status !== BillStatus.PENDING && bill.status !== BillStatus.REOPENED) {
      throw new Error("Only pending or reopened bills can have items voided");
    }

    const billItem = await this.billItemRepository.findOne({
      where: { id: itemId, bill_id: billId }
    });

    if (!billItem) {
      throw new Error("Bill item not found");
    }

    if (billItem.status !== BillItemStatus.PENDING) {
      throw new Error("Only pending items can be voided");
    }

    // Use transaction for atomic operations (Rule 4.8)
    return await this.billItemRepository.manager.transaction(async manager => {
      // Update item status to void_pending
      billItem.status = BillItemStatus.VOID_PENDING;
      billItem.void_reason = reason;
      billItem.void_requested_by = requestedBy;
      billItem.void_requested_at = new Date();

      const savedItem = await manager.save(billItem);

      // Send notification to cashier/supervisor
      // Note: We need to determine who should receive the notification (cashier/supervisor)
      // For now, we'll get the bill's user (sales person) and notify supervisors/cashiers
      // This could be enhanced to query for users with cashier/supervisor roles
      try {
        const bill = await manager.findOne(Bill, {
          where: { id: billId },
          relations: ["user"]
        });

        if (bill && bill.user_id) {
          // Get supervisor/cashier users - for now, we'll need to query for users with appropriate roles
          // This is a simplified approach - in production, you'd query for users with cashier/supervisor roles
          // For now, we'll create a notification for the bill owner (they can forward it)
          // TODO: Enhance to send to all cashiers/supervisors
          await this.notificationService.createVoidRequestNotification(
            billId,
            itemId,
            bill.user_id, // Send to bill owner for now
            requestedBy,
            reason
          );
        }
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Don't fail the transaction for notification errors
      }

      return savedItem;
    });
  }

  // Approve or reject void request (Rule 4.3, 4.5)
  async approveVoidRequest(
    billId: number,
    itemId: number,
    approvedBy: number,
    approved: boolean,
    approvalNotes?: string,
    paperApprovalReceived: boolean = false
  ) {
    // Validate business rules (Rule 4.8)
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ["bill_items"]
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    if (bill.status !== BillStatus.PENDING && bill.status !== BillStatus.REOPENED) {
      throw new Error("Only pending or reopened bills can have void requests approved");
    }

    const billItem = await this.billItemRepository.findOne({
      where: { id: itemId, bill_id: billId }
    });

    if (!billItem) {
      throw new Error("Bill item not found");
    }

    if (billItem.status !== BillItemStatus.VOID_PENDING) {
      throw new Error("Only pending void items can be approved/rejected");
    }

    // Use transaction for atomic operations (Rule 4.8)
    const out = await this.billItemRepository.manager.transaction(async manager => {
      if (approved) {
        // Approve void request - mark item as voided (not deleted)
        billItem.status = BillItemStatus.VOIDED;
        billItem.void_approved_by = approvedBy;
        billItem.void_approved_at = new Date();

        // Update bill total to exclude voided item from calculations
        // Item record remains in database for audit trail
        const activeItems = bill.bill_items.filter(item =>
          item.id !== itemId && item.status !== BillItemStatus.VOIDED
        );
        const newTotal = activeItems.reduce((sum, item) => sum + item.subtotal, 0);

        bill.total = newTotal;
        await manager.save(bill);

        // REOPENED: inventory was deducted at original submit — return stock. PENDING: no stock movement; availability updates via cache invalidation.
        if (bill.status === BillStatus.REOPENED) {
          try {
            await this.inventoryService.returnInventoryForVoidedItem(
              billId,
              itemId,
              billItem.quantity || 0,
              approvedBy
            );
          } catch (inventoryError: any) {
            // Log error but don't fail void approval
            // Inventory return is important but shouldn't block void approval
            console.error(`Failed to return inventory for voided item ${itemId} in bill ${billId}:`, inventoryError);
          }
        }
      } else {
        // Reject void request - revert item to pending
        billItem.status = BillItemStatus.PENDING;
        billItem.void_reason = null;
        billItem.void_requested_by = null;
        billItem.void_requested_at = null;
        billItem.void_approved_by = approvedBy;
        billItem.void_approved_at = new Date();

        // Bill status remains unchanged when void request is rejected
        // Recalculate bill total to include the item that was reverted to pending
        const activeItems = bill.bill_items.filter(item =>
          item.status !== BillItemStatus.VOIDED
        );
        const newTotal = activeItems.reduce((sum, item) => sum + item.subtotal, 0);

        bill.total = newTotal;
        await manager.save(bill);
      }

      const savedItem = await manager.save(billItem);

      // Send notification to sales person who requested the void
      try {
        const salesUserId = billItem.void_requested_by;
        if (salesUserId) {
          if (approved) {
            await this.notificationService.createVoidApprovedNotification(
              billId,
              itemId,
              salesUserId,
              approvedBy
            );
          } else {
            await this.notificationService.createVoidRejectedNotification(
              billId,
              itemId,
              salesUserId,
              approvedBy,
              approvalNotes || "No reason provided"
            );
          }
        }
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Don't fail the transaction for notification errors
      }

      return savedItem;
    });
    InventoryService.invalidateInventoryCache();
    return out;
  }

  // Legacy method - kept for backward compatibility
  async voidBillItem(billItemId: number) {
    const billItem = await this.billItemRepository.findOne({
      where: { id: billItemId },
    });

    if (!billItem) {
      throw new Error("Bill item not found");
    }

    billItem.status = BillItemStatus.VOIDED;
    const saved = await this.billItemRepository.save(billItem);
    InventoryService.invalidateInventoryCache();
    return saved;
  }

  async fetchBillItems(billId: number) {
    const query = `
    SELECT 
      bill_item.id,
      bill_item.quantity,
      bill_item.subtotal,
      bill_item.status,
      item.name AS item_name,
      bill_item.created_at AS created_at,
      pi.price AS item_price
    FROM 
      bill_item
    JOIN 
      item ON bill_item.item_id = item.id
    JOIN 
      pricelist_item pi ON pi.item_id = item.id
    WHERE 
      bill_item.bill_id = ?
  `;
    return await AppDataSource.query(query, [billId]);
  }

  async submitBill(billPayment: BillPaymentInterface) {
    const bill = await AppDataSource.createQueryBuilder("bill", "bill")
      .leftJoinAndSelect("bill.bill_items", "billItem")
      .leftJoinAndSelect("billItem.item", "item")
      .leftJoinAndSelect("bill.user", "user")
      .where("bill.id = :id", { id: billPayment.billId })
      .getOne();

    if (!bill) {
      throw new Error(`Bill with ID ${billPayment.billId} not found`);
    }

    // Validate that the user trying to submit is the bill creator
    if (bill.user_id && billPayment.userId && bill.user_id !== billPayment.userId) {
      throw new Error("You can only submit bills that you created. This bill was created by a different user.");
    }

    // Note: Frontend handles disabling submit button for bills with pending void requests
    // Backend validation removed to allow graceful UI handling

    const paymentPayloads = this.generatePaymentPayloads(billPayment);
    if (!paymentPayloads || paymentPayloads.length === 0) {
      throw new Error("No payment payloads generated");
    }

    await this.ensureUniqueMpesaReferences(paymentPayloads);

    try {
      const result = await AppDataSource.transaction(
        async (transactionalEntityManager) => {
          const payments = [];
          const billPayments = [];

          for (const payload of paymentPayloads) {
            const payment: Payment = this.paymentRepository.create(payload);
            const savedPayment = await transactionalEntityManager.save(
              Payment,
              payment,
            );
            payments.push(savedPayment);

            const billPaymentPayload = {
              payment: { id: savedPayment.id },
              bill: { id: bill.id },
              created_by: payload.created_by,
            };

            const newBillPayment =
              this.billPaymentRepository.create(billPaymentPayload);
            const savedBillPayment = await transactionalEntityManager.save(
              BillPayment,
              newBillPayment,
            );
            billPayments.push(savedBillPayment);
          }

          bill.status = BillStatus.SUBMITTED;
          await transactionalEntityManager.save(Bill, bill);

          // Update all bill items to SUBMITTED status
          await transactionalEntityManager.update(
            BillItem,
            { bill: { id: bill.id }, status: BillItemStatus.PENDING },
            { status: BillItemStatus.SUBMITTED }
          );

          return {
            bill_payments: billPayments,
            payments,
            bill,
          };
        },
      );

      // Deduct stock on submit (pending bills no longer count toward availability once submitted).
      // Runs after the DB transaction commits so bill status is SUBMITTED.
      try {
        await this.inventoryService.deductInventoryForSale(bill.id, billPayment.userId);
      } catch (error: any) {
        // Log error but don't fail bill submission
        // Inventory deduction is important but shouldn't block payment processing
        console.error(`Failed to deduct inventory for bill ${bill.id}:`, error);
      }

      return result;
    } catch (error: any) {
      console.error("Error in submitBill transaction:", error);
      console.error("Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        billId: billPayment.billId
      });
      // Preserve original error message if available, otherwise use generic message
      const errorMessage = error?.message || "Failed to submit bill. Please try again.";
      throw new Error(errorMessage);
    }
  }

  private generatePaymentPayloads(
    billPayment: BillPaymentInterface,
  ): Payment[] {
    const { userId, paymentMethod, cashAmount, mpesaAmount, mpesaCode } =
      billPayment;

    const paymentMap = {
      cash_mpesa: [
        { creditAmount: cashAmount, paymentType: PaymentType.CASH, reference: null },
        {
          creditAmount: mpesaAmount,
          paymentType: PaymentType.MPESA,
          reference: mpesaCode || null,
        },
      ],
      cash: [{ creditAmount: cashAmount, paymentType: PaymentType.CASH, reference: null }],
      mpesa: [
        {
          creditAmount: mpesaAmount,
          paymentType: PaymentType.MPESA,
          reference: mpesaCode || null,
        },
      ],
    };

    return (paymentMap[paymentMethod] || []).map((payment: any) => ({
      ...payment,
      reference: this.normalizePaymentReference(payment.reference),
      created_by: userId,
    }));
  }

  private async ensureUniqueMpesaReferences(paymentPayloads: Payment[]): Promise<void> {
    const mpesaReferences = paymentPayloads
      .filter((payment) => payment.paymentType === PaymentType.MPESA)
      .map((payment) => this.normalizePaymentReference(payment.reference))
      .filter((reference): reference is string => Boolean(reference));

    if (mpesaReferences.length === 0) {
      return;
    }

    const uniqueReferences = Array.from(new Set(mpesaReferences));
    const duplicateCount = await this.paymentRepository
      .createQueryBuilder("payment")
      .where("payment.payment_type = :paymentType", { paymentType: PaymentType.MPESA })
      .andWhere("UPPER(TRIM(payment.reference)) IN (:...references)", {
        references: uniqueReferences,
      })
      .getCount();

    if (duplicateCount > 0) {
      throw new Error("M-Pesa reference code already exists. Please use a different code.");
    }
  }

  async closeBill(billId: number) {
    const bill = await AppDataSource.createQueryBuilder("bill", "bill")
      .leftJoinAndSelect("bill.bill_payments", "billPayment")
      .leftJoinAndSelect("billPayment.payment", "payment")
      .where("bill.id = :id", { id: billId })
      .getOne();

    if (!bill) {
      throw new EntityNotFoundError(
        Bill,
        "Cannot close bill. Please confirm payments",
      );
    }

    const billAmount = bill.total || 0;
    const paidAmount = bill.bill_payments?.reduce(
      (sum, billPayment) => sum + billPayment.payment.creditAmount,
      0,
    ) || 0;

    // Use floating point comparison with tolerance (0.01) to account for precision issues
    const amountDifference = Math.abs(paidAmount - billAmount);
    if (amountDifference > 0.01) {
      throw new Error(`Cannot close bill. Payment discrepancy: $${amountDifference.toFixed(2)}. Bill total: $${billAmount.toFixed(2)}, Paid: $${paidAmount.toFixed(2)}`);
    }

    await AppDataSource.createQueryBuilder()
      .update(Bill)
      .set({ status: BillStatus.CLOSED })
      .where("id = :id", { id: bill.id })
      .execute();

    // Update all bill items to CLOSED status
    await AppDataSource.createQueryBuilder()
      .update(BillItem)
      .set({ status: BillItemStatus.CLOSED })
      .where("bill_id = :billId", { billId: bill.id })
      .execute();

    // Fetch and return the updated bill
    const updatedBill = await AppDataSource.createQueryBuilder("bill", "bill")
      .leftJoinAndSelect("bill.bill_items", "billItem")
      .leftJoinAndSelect("billItem.item", "item")
      .leftJoinAndSelect("bill.bill_payments", "billPayment")
      .leftJoinAndSelect("billPayment.payment", "payment")
      .leftJoinAndSelect("bill.user", "user")
      .leftJoinAndSelect("bill.station", "station")
      .where("bill.id = :id", { id: billId })
      .getOne();

    return updatedBill || bill;
  }

  async closeBillsBulk(billIds: number[]) {
    const results = [];
    for (const billId of billIds) {
      try {
        await this.closeBill(billId);
        results.push({ billId, status: "closed" });
      } catch (error: any) {
        results.push({ billId, status: "failed", error: error.message });
      }
    }
    return results;
  }

  async submitBillsBulk(billPayments: BillPaymentInterface[], userId: number) {
    const results = [];
    for (const billPayment of billPayments) {
      try {
        billPayment.userId = userId;
        await this.submitBill(billPayment);
        results.push({ billId: billPayment.billId, status: "submitted" });
      } catch (error: any) {
        results.push({ billId: billPayment.billId, status: "failed", error: error.message });
      }
    }
    return results;
  }

  // ===== BILL REOPENING METHODS =====

  /**
   * Reopen a submitted bill (Rule 4.4, 4.5)
   */
  async reopenBill(
    billId: number,
    reopenedBy: number,
    reasonKey: string
  ): Promise<Bill> {
    // Validate business rules (Rule 4.8)
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ["bill_items", "bill_payments", "bill_payments.payment"]
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    if (!bill.canReopen()) {
      throw new Error("Only submitted bills can be reopened");
    }

    // Validate that bill actually needs reopening (has payment issues)
    const totalPaid = bill.bill_payments?.reduce(
      (sum, billPayment) => sum + billPayment.payment.creditAmount,
      0
    ) || 0;

    const hasPaymentDiscrepancy = totalPaid !== bill.total;
    const hasZeroPayments = totalPaid === 0;
    const hasPartialPayments = totalPaid > 0 && totalPaid < bill.total;

    if (!hasPaymentDiscrepancy && !hasZeroPayments && !hasPartialPayments) {
      throw new Error("Bill is properly paid and does not need reopening");
    }

    // Use transaction for atomic operations (Rule 4.8)
    return await this.billRepository.manager.transaction(async manager => {
      // Update bill status to reopened and add tracking columns (Rule 4.1)
      bill.status = BillStatus.REOPENED;
      bill.reopen_reason = reasonKey;
      bill.reopened_by = reopenedBy;
      bill.reopened_at = new Date();
      // updated_at is automatically managed by TypeORM's UpdateDateColumn
      bill.updated_by = reopenedBy;

      const savedBill = await manager.save(bill);

      // Send notification to sales person
      try {
        // Note: NotificationService would need to be implemented
        console.log(`Bill ${billId} reopened by user ${reopenedBy} for reason: ${reasonKey}`);
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Don't fail the transaction for notification errors
      }

      return savedBill;
    });
  }

  /**
   * Resubmit a reopened bill (Rule 4.4, 4.5)
   */
  async resubmitBill(
    billId: number,
    resubmittedBy: number,
    notes?: string
  ): Promise<Bill> {
    // Validate business rules (Rule 4.8)
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ["bill_items"]
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    if (!bill.canResubmit()) {
      throw new Error("Only reopened bills can be resubmitted");
    }

    // Use transaction for atomic operations (Rule 4.8)
    return await this.billRepository.manager.transaction(async manager => {
      // Update bill status to submitted
      bill.status = BillStatus.SUBMITTED;
      // updated_at is automatically managed by TypeORM's UpdateDateColumn
      bill.updated_by = resubmittedBy;

      // Clear reopening tracking columns
      bill.reopen_reason = null;
      bill.reopened_by = null;
      bill.reopened_at = null;

      const savedBill = await manager.save(bill);

      // Send notification to cashier/supervisor
      try {
        console.log(`Bill ${billId} resubmitted by user ${resubmittedBy} with notes: ${notes || "No notes"}`);
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Don't fail the transaction for notification errors
      }

      return savedBill;
    });
  }

  /**
   * Request quantity change for a bill item (Rule 4.3, 4.4)
   */
  async requestQuantityChange(
    billId: number,
    itemId: number,
    requestedBy: number,
    requestedQuantity: number,
    reason: string
  ): Promise<BillItem> {
    // Validate business rules (Rule 4.8)
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ["bill_items"]
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    if (bill.status !== BillStatus.PENDING && bill.status !== BillStatus.REOPENED) {
      throw new Error("Only pending or reopened bills can have quantity changes requested");
    }

    const billItem = await this.billItemRepository.findOne({
      where: { id: itemId, bill_id: billId }
    });

    if (!billItem) {
      throw new Error("Bill item not found");
    }

    if (billItem.status !== BillItemStatus.PENDING) {
      throw new Error("Only pending items can have quantity changes requested");
    }

    if (requestedQuantity === billItem.quantity) {
      throw new Error("Requested quantity must be different from current quantity");
    }

    // Use transaction for atomic operations (Rule 4.8)
    return await this.billItemRepository.manager.transaction(async manager => {
      // Update item status to quantity change request
      billItem.status = BillItemStatus.QUANTITY_CHANGE_REQUEST;
      billItem.requested_quantity = requestedQuantity;
      billItem.quantity_change_reason = reason;
      billItem.quantity_change_requested_by = requestedBy;
      billItem.quantity_change_requested_at = new Date();
      // updated_at is automatically managed by TypeORM's UpdateDateColumn

      const savedItem = await manager.save(billItem);

      // Send notification to cashier/supervisor
      try {
        // TODO: Implement notification system
        console.log(`Quantity change request for item ${itemId} in bill ${billId}`);
      } catch (error) {
        // Don't fail the transaction for notification errors
      }

      return savedItem;
    });
  }

  /**
   * Approve or reject quantity change request (Rule 4.3, 4.4)
   */
  async approveQuantityChange(
    billId: number,
    itemId: number,
    approvedBy: number,
    approved: boolean,
    approvalNotes?: string,
    paperApprovalReceived: boolean = false
  ): Promise<BillItem> {
    // Validate business rules (Rule 4.8)
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ["bill_items"]
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    if (bill.status !== BillStatus.PENDING && bill.status !== BillStatus.REOPENED) {
      throw new Error("Only pending or reopened bills can have quantity change requests approved");
    }

    const billItem = await this.billItemRepository.findOne({
      where: { id: itemId, bill_id: billId }
    });

    if (!billItem) {
      throw new Error("Bill item not found");
    }

    if (billItem.status !== BillItemStatus.QUANTITY_CHANGE_REQUEST) {
      throw new Error("Only pending quantity change items can be approved/rejected");
    }

    // Use transaction for atomic operations (Rule 4.8)
    const out = await this.billItemRepository.manager.transaction(async manager => {
      if (approved) {
        // Approve quantity change - update quantity and recalculate subtotal
        const oldQuantity = billItem.quantity;
        const newQuantity = billItem.requested_quantity!;
        const unitPrice = billItem.subtotal / oldQuantity; // Calculate unit price
        const newSubtotal = unitPrice * newQuantity;

        billItem.quantity = newQuantity;
        billItem.subtotal = newSubtotal;
        billItem.status = BillItemStatus.PENDING;
        billItem.quantity_change_approved_by = approvedBy;
        billItem.quantity_change_approved_at = new Date();
        // updated_at is automatically managed by TypeORM's UpdateDateColumn

        // Clear quantity change request fields
        billItem.requested_quantity = null;
        billItem.quantity_change_reason = null;
        billItem.quantity_change_requested_by = null;
        billItem.quantity_change_requested_at = null;

        // Update bill total to reflect the quantity change
        const activeItems = bill.bill_items.filter(item =>
          item.id !== itemId && item.status !== BillItemStatus.VOIDED
        );
        const newTotal = activeItems.reduce((sum, item) => sum + item.subtotal, 0) + newSubtotal;

        bill.total = newTotal;
        bill.status = BillStatus.PENDING; // Bill needs to be resubmitted after quantity change
        // updated_at is automatically managed by TypeORM's UpdateDateColumn
        await manager.save(bill);
      } else {
        // Reject quantity change - revert to pending status
        billItem.status = BillItemStatus.PENDING;
        billItem.quantity_change_approved_by = approvedBy;
        billItem.quantity_change_approved_at = new Date();
        // updated_at is automatically managed by TypeORM's UpdateDateColumn

        // Clear quantity change request fields
        billItem.requested_quantity = null;
        billItem.quantity_change_reason = null;
        billItem.quantity_change_requested_by = null;
        billItem.quantity_change_requested_at = null;

        // Recalculate bill total to include the item as is
        const activeItems = bill.bill_items.filter(item =>
          item.status !== BillItemStatus.VOIDED
        );
        const newTotal = activeItems.reduce((sum, item) => sum + item.subtotal, 0);

        bill.total = newTotal;
        bill.status = BillStatus.PENDING; // Bill needs to be resubmitted after quantity change rejection
        // updated_at is automatically managed by TypeORM's UpdateDateColumn
        await manager.save(bill);
      }

      const savedItem = await manager.save(billItem);

      // Send notification to sales person
      try {
        // TODO: Implement notification system
        console.log(`Quantity change request ${approved ? "approved" : "rejected"} for item ${itemId} in bill ${billId}`);
      } catch (error) {
        // Don't fail the transaction for notification errors
      }

      return savedItem;
    });
    InventoryService.invalidateInventoryCache();
    return out;
  }

  // Get void requests (bills with items in void_pending status)
  // Rule 4.3: Voiding is allowed in 'submitted' or 'reopened' states
  // Supervisors should see all void requests, sales users see only their own
  async getVoidRequests(userId?: number) {
    // First, find all bill items with void_pending status
    const voidPendingItems = await this.billItemRepository.find({
      where: {
        status: BillItemStatus.VOID_PENDING
      },
      relations: ["bill", "item", "bill.user", "bill.station"]
    });

    // Get unique bill IDs
    const billIds = [...new Set(voidPendingItems.map(item => item.bill_id))];

    if (billIds.length === 0) {
      return [];
    }

    // Fetch bills with their items
    // Note: Void requests can be created on PENDING, SUBMITTED, or REOPENED bills
    // We need to show all void_pending items regardless of bill status for supervisor approval
    const queryBuilder = this.billRepository
      .createQueryBuilder("bill")
      .leftJoinAndSelect("bill.bill_items", "bill_item")
      .leftJoinAndSelect("bill_item.item", "item")
      .leftJoinAndSelect("bill.user", "user")
      .leftJoinAndSelect("bill.station", "station")
      .where("bill.id IN (:...billIds)", { billIds })
      // Include all statuses where void requests can exist (PENDING, SUBMITTED, REOPENED)
      // Exclude CLOSED and VOIDED as those are terminal states
      .andWhere("bill.status IN (:...statuses)", {
        statuses: [BillStatus.PENDING, BillStatus.SUBMITTED, BillStatus.REOPENED]
      });

    // Only filter by userId for sales users - supervisors see all requests
    // If userId is provided, it means we want to filter by user (for sales role)
    // If userId is not provided (undefined), show all requests (for supervisor role)
    if (userId) {
      queryBuilder.andWhere("bill.user_id = :userId", { userId });
    }

    const bills = await queryBuilder.getMany();

    // Transform to void request format expected by VoidRequestManager
    const voidRequests = [];
    for (const bill of bills) {
      const pendingItems = bill.bill_items?.filter(item => item.status === BillItemStatus.VOID_PENDING) || [];
      for (const item of pendingItems) {
        // Get the user who requested the void
        const requestedByUser = item.void_requested_by
          ? await this.userService.getUserById(item.void_requested_by).catch(() => null)
          : null;

        voidRequests.push({
          id: item.id, // Use item.id as the void request ID (for compatibility)
          bill_id: bill.id,
          item_id: item.id, // Add item_id for approval endpoint
          initiated_by: item.void_requested_by || 0,
          reason: item.void_reason || "",
          status: "pending",
          created_at: item.void_requested_at?.toISOString() || item.created_at?.toISOString() || new Date().toISOString(),
          initiator: requestedByUser ? {
            id: requestedByUser.id,
            firstName: requestedByUser.firstName || "",
            lastName: requestedByUser.lastName || "",
            username: requestedByUser.username || ""
          } : {
            id: 0,
            firstName: "Unknown",
            lastName: "User",
            username: ""
          },
          bill: {
            id: bill.id,
            total: bill.total || 0,
            status: bill.status,
            created_at: bill.created_at?.toISOString() || new Date().toISOString(),
            user: bill.user ? {
              firstName: bill.user.firstName || "",
              lastName: bill.user.lastName || ""
            } : {
              firstName: "",
              lastName: ""
            },
            station: bill.station ? {
              name: bill.station.name || ""
            } : {
              name: ""
            }
          },
          item: item.item ? {
            id: item.item.id,
            name: item.item.name || ""
          } : {
            id: 0,
            name: ""
          }
        });
      }
    }

    return voidRequests;
  }

  // Unified method to get change requests (void or quantity_change)
  // requestType: "void" | "quantity_change" | "all"
  async getChangeRequests(userId?: number, requestType: "void" | "quantity_change" | "all" = "all") {
    const requests = [];

    if (requestType === "void" || requestType === "all") {
      const voidRequests = await this.getVoidRequests(userId);
      requests.push(...voidRequests.map(req => ({ ...req, type: "void" })));
    }

    if (requestType === "quantity_change" || requestType === "all") {
      const quantityChangeRequests = await this.getQuantityChangeRequests(userId);
      requests.push(...quantityChangeRequests.map(req => ({ ...req, type: "quantity_change" })));
    }

    // Sort by created_at descending
    return requests.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }

  // Get void request statistics
  // Match the filtering logic in getVoidRequests() to ensure consistency
  // Include PENDING, SUBMITTED, and REOPENED bills (exclude CLOSED and VOIDED)
  async getVoidRequestStats() {
    // Use query builder to count void_pending items from bills with pending, submitted, or reopened status
    const pendingCount = await this.billItemRepository
      .createQueryBuilder("billItem")
      .innerJoin("bill", "bill", "bill.id = billItem.bill_id")
      .where("billItem.status = :status", { status: BillItemStatus.VOID_PENDING })
      .andWhere("bill.status IN (:...statuses)", {
        statuses: [BillStatus.PENDING, BillStatus.SUBMITTED, BillStatus.REOPENED]
      })
      .getCount();

    return {
      pending: pendingCount
    };
  }

  // Get quantity change requests (bills with items in quantity_change_request status)
  // Rule 4.3: Quantity changes are allowed in 'pending' or 'reopened' states
  // Supervisors should see all quantity change requests, sales users see only their own
  async getQuantityChangeRequests(userId?: number) {
    // First, find all bill items with quantity_change_request status
    const quantityChangeItems = await this.billItemRepository.find({
      where: {
        status: BillItemStatus.QUANTITY_CHANGE_REQUEST
      },
      relations: ["bill", "item", "bill.user", "bill.station"]
    });

    // Get unique bill IDs
    const billIds = [...new Set(quantityChangeItems.map(item => item.bill_id))];

    if (billIds.length === 0) {
      return [];
    }

    // Fetch bills with their items
    // Rule 4.3: Quantity changes allowed in 'pending' or 'reopened' states
    const queryBuilder = this.billRepository
      .createQueryBuilder("bill")
      .leftJoinAndSelect("bill.bill_items", "bill_item")
      .leftJoinAndSelect("bill_item.item", "item")
      .leftJoinAndSelect("bill.user", "user")
      .leftJoinAndSelect("bill.station", "station")
      .where("bill.id IN (:...billIds)", { billIds })
      .andWhere("bill.status IN (:...statuses)", {
        statuses: [BillStatus.PENDING, BillStatus.REOPENED]
      });

    // Only filter by userId for sales users - supervisors see all requests
    if (userId) {
      queryBuilder.andWhere("bill.user_id = :userId", { userId });
    }

    const bills = await queryBuilder.getMany();

    // Transform to quantity change request format
    const quantityChangeRequests = [];
    for (const bill of bills) {
      const pendingItems = bill.bill_items?.filter(item => item.status === BillItemStatus.QUANTITY_CHANGE_REQUEST) || [];
      for (const item of pendingItems) {
        // Get the user who requested the quantity change
        const requestedByUser = item.quantity_change_requested_by
          ? await this.userService.getUserById(item.quantity_change_requested_by).catch(() => null)
          : null;

        // Calculate new bill total after quantity change
        // Unit price = current subtotal / current quantity
        const unitPrice = item.quantity > 0 ? (item.subtotal / item.quantity) : 0;
        const requestedQuantity = item.requested_quantity || item.quantity;
        const newSubtotal = unitPrice * requestedQuantity;

        // Calculate new bill total:
        // Sum all other items (excluding voided items and this item) + new subtotal for this item
        const otherItems = bill.bill_items?.filter(billItem =>
          billItem.id !== item.id && billItem.status !== BillItemStatus.VOIDED
        ) || [];
        const otherItemsTotal = otherItems.reduce((sum, billItem) => sum + (billItem.subtotal || 0), 0);
        const newBillTotal = otherItemsTotal + newSubtotal;

        quantityChangeRequests.push({
          id: item.id, // Use item.id as the quantity change request ID
          bill_id: bill.id,
          item_id: item.id,
          initiated_by: item.quantity_change_requested_by || 0,
          current_quantity: item.quantity,
          requested_quantity: requestedQuantity,
          reason: item.quantity_change_reason || "",
          status: "pending",
          created_at: item.quantity_change_requested_at?.toISOString() || item.created_at?.toISOString() || new Date().toISOString(),
          current_bill_total: bill.total || 0,
          new_bill_total: newBillTotal,
          initiator: requestedByUser ? {
            id: requestedByUser.id,
            firstName: requestedByUser.firstName || "",
            lastName: requestedByUser.lastName || "",
            username: requestedByUser.username || ""
          } : {
            id: 0,
            firstName: "Unknown",
            lastName: "User",
            username: ""
          },
          bill: {
            id: bill.id,
            total: bill.total || 0,
            status: bill.status,
            created_at: bill.created_at?.toISOString() || new Date().toISOString(),
            user: bill.user ? {
              firstName: bill.user.firstName || "",
              lastName: bill.user.lastName || ""
            } : {
              firstName: "",
              lastName: ""
            },
            station: bill.station ? {
              name: bill.station.name || ""
            } : {
              name: ""
            }
          },
          item: item.item ? {
            id: item.item.id,
            name: item.item.name || ""
          } : {
            id: 0,
            name: ""
          }
        });
      }
    }

    return quantityChangeRequests;
  }

  // Get quantity change request statistics
  async getQuantityChangeRequestStats() {
    const pendingCount = await this.billItemRepository.count({
      where: {
        status: BillItemStatus.QUANTITY_CHANGE_REQUEST
      }
    });

    return {
      pending: pendingCount
    };
  }
}
