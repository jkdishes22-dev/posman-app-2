import { Bill, BillStatus } from "@entities/Bill";
import { BillItem, BillItemStatus } from "@entities/BillItem";
import { AppDataSource } from "@backend/config/data-source";
import { UserService } from "./UserService";
import { BillPaymentInterface } from "@backend/interfaces/BillPayment";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getAppTimezone } from "@backend/config/timezone";
import { BillPayment } from "@backend/entities/BillPayment";
import { Payment, PaymentType } from "@backend/entities/Payment";
import { Service } from "typedi";
import { DataSource, EntityNotFoundError, Repository } from "typeorm";

export type BillFilter = {
  targetDate: Date;
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

  constructor(dataSource: DataSource) {
    this.billRepository = dataSource.getRepository(Bill);
    this.billItemRepository = dataSource.getRepository(BillItem);
    this.paymentRepository = dataSource.getRepository(Payment);
    this.billPaymentRepository = dataSource.getRepository(BillPayment);

    this.userService = new UserService(dataSource);
  }

  async createBill(payload) {
    const { items, total, user_id, station_id, request_id } = payload;

    return await this.billRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Check for idempotency - if request_id is provided, check if bill already exists
        if (request_id) {
          const existingBill = await transactionalEntityManager.findOne(Bill, {
            where: { request_id },
            relations: ['bill_items', 'bill_items.item', 'user', 'station']
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

        await transactionalEntityManager.save(BillItem, billItems);

        // Fetch the complete bill with relations for return
        const completeBill = await transactionalEntityManager.findOne(Bill, {
          where: { id: newBill.id },
          relations: ['bill_items', 'bill_items.item', 'user', 'station']
        });

        return completeBill;
      },
    );
  }

  async fetchBills(userId: number, billFilter: BillFilter, page = 1, pageSize = 20) {
    const { targetDate, status, billId, billingUserId } = billFilter;
    let startOfDayDate, endOfDayDate;
    if (targetDate) {
      // targetDate is in UTC format (YYYY-MM-DDTHH:MM:SS.000Z)
      // Convert to local timezone for database comparison since DB stores in local time
      const appTimezone = getAppTimezone();
      const localDate = toZonedTime(targetDate, appTimezone);

      // Create local date range for the entire day
      startOfDayDate = startOfDay(localDate);
      endOfDayDate = endOfDay(localDate);
    }

    const currentUser = await this.userService.getUserById(userId);

    const roleNames = ["user", "waitress"];
    const includeBills = currentUser.roles.some((role) =>
      roleNames.includes(role.name),
    );

    try {
      const query = this.billRepository
        .createQueryBuilder("bill")
        .leftJoinAndSelect("bill.bill_items", "billItem")
        .leftJoinAndSelect("billItem.item", "item")
        .leftJoinAndSelect("bill.bill_payments", "billPayment")
        .leftJoinAndSelect("billPayment.payment", "payment")
        .leftJoinAndSelect("bill.user", "user")
        .leftJoinAndSelect("bill.station", "station");

      if (targetDate) {
        query.where("bill.created_at BETWEEN :start AND :end", {
          start: startOfDayDate,
          end: endOfDayDate,
        });
      }

      if (status) {
        query.andWhere("bill.status = :status", { status });
      }

      if (billId) {
        query.andWhere("bill.id = :billId", { billId });
      }

      if (userId && includeBills) {
        query.andWhere("bill.user_id = :userId", { userId });
      }

      if (billingUserId) {
        query.andWhere("bill.user_id = :billingUserId", { billingUserId });
      }

      // Add consistent ordering for pagination
      query.orderBy("bill.created_at", "DESC");

      // Get total count before pagination (clone the query for count)
      const countQuery = query.clone();
      const total = await countQuery.getCount();

      // Apply pagination to the original query
      query.skip((page - 1) * pageSize).take(pageSize);

      const bills = await query.getMany();

      // Get item prices for all bill items
      const billItemIds = bills.flatMap(bill =>
        bill.bill_items?.map(item => item.id) || []
      );

      let itemPrices = {};
      if (billItemIds.length > 0) {
        const priceQuery = this.billItemRepository
          .createQueryBuilder("billItem")
          .leftJoin("pricelist_item", "pi", "pi.item_id = billItem.item_id")
          .select([
            "billItem.id as billItemId",
            "pi.price as price"
          ])
          .where("billItem.id IN (:...billItemIds)", { billItemIds });

        const priceResults = await priceQuery.getRawMany();
        itemPrices = priceResults.reduce((acc, result) => {
          acc[result.billItemId] = result.price || 0;
          return acc;
        }, {});
      }

      // Transform bills to include item prices
      const transformedBills = bills.map(bill => ({
        ...bill,
        bill_items: bill.bill_items?.map(item => ({
          ...item,
          item: {
            ...item.item,
            price: itemPrices[item.id] || 0
          }
        })) || []
      }));

      return { bills: transformedBills, total };
    } catch (error) {
      console.error("Error fetching bills:", error);
      throw error;
    }
  }

  async cancelBill(billId: number) {
    const bill = await this.billRepository.findOne({ where: { id: billId } });

    if (!bill) {
      throw new Error("Bill not found");
    }

    bill.status = BillStatus.CANCELLED;
    return await this.billRepository.save(bill);
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
      billItem.updated_at = new Date();

      const savedItem = await manager.save(billItem);

      // Send notification to cashier/supervisor
      try {
        console.log(`Void request for Bill ${billId}, Item ${itemId} by user ${requestedBy}. Reason: ${reason}`);
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
    return await this.billItemRepository.manager.transaction(async manager => {
      if (approved) {
        // Approve void request - mark item as voided (not deleted)
        billItem.status = BillItemStatus.VOIDED;
        billItem.void_approved_by = approvedBy;
        billItem.void_approved_at = new Date();
        billItem.updated_at = new Date();

        // Update bill total to exclude voided item from calculations
        // Item record remains in database for audit trail
        const activeItems = bill.bill_items.filter(item =>
          item.id !== itemId && item.status !== BillItemStatus.VOIDED
        );
        const newTotal = activeItems.reduce((sum, item) => sum + item.subtotal, 0);

        bill.total = newTotal;
        bill.updated_at = new Date();
        await manager.save(bill);
      } else {
        // Reject void request - revert item to pending
        billItem.status = BillItemStatus.PENDING;
        billItem.void_reason = null;
        billItem.void_requested_by = null;
        billItem.void_requested_at = null;
        billItem.void_approved_by = approvedBy;
        billItem.void_approved_at = new Date();
        billItem.updated_at = new Date();

        // Bill status remains unchanged when void request is rejected
        // Recalculate bill total to include the item that was reverted to pending
        const activeItems = bill.bill_items.filter(item =>
          item.status !== BillItemStatus.VOIDED
        );
        const newTotal = activeItems.reduce((sum, item) => sum + item.subtotal, 0);

        bill.total = newTotal;
        bill.updated_at = new Date();
        await manager.save(bill);
      }

      const savedItem = await manager.save(billItem);

      // Send notification to sales person
      try {
        console.log(`Void request for Bill ${billId}, Item ${itemId} ${approved ? 'approved' : 'rejected'} by user ${approvedBy}`);
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Don't fail the transaction for notification errors
      }

      return savedItem;
    });
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
    return await this.billItemRepository.save(billItem);
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

    // Note: Frontend handles disabling submit button for bills with pending void requests
    // Backend validation removed to allow graceful UI handling

    const paymentPayloads = this.generatePaymentPayloads(billPayment);
    if (!paymentPayloads || paymentPayloads.length === 0) {
      throw new Error("No payment payloads generated");
    }

    try {
      return await AppDataSource.transaction(
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
    } catch (error: any) {
      throw new Error("Failed to submit bill. Please try again.");
    }
  }

  private generatePaymentPayloads(
    billPayment: BillPaymentInterface,
  ): Payment[] {
    const { userId, paymentMethod, cashAmount, mpesaAmount, mpesaCode } =
      billPayment;

    const paymentMap = {
      cash_mpesa: [
        { creditAmount: cashAmount, paymentType: PaymentType.CASH },
        {
          creditAmount: mpesaAmount,
          paymentType: PaymentType.MPESA,
          reference: mpesaCode,
        },
      ],
      cash: [{ creditAmount: cashAmount, paymentType: PaymentType.CASH }],
      mpesa: [
        {
          creditAmount: mpesaAmount,
          paymentType: PaymentType.MPESA,
          reference: mpesaCode,
        },
      ],
    };

    return (paymentMap[paymentMethod] || []).map((payment: any) => ({
      ...payment,
      created_by: userId,
    }));
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

    const billAmount = bill.total;
    const paidAmount = bill.bill_payments.reduce(
      (sum, billPayment) => sum + billPayment.payment.creditAmount,
      0,
    );

    if (billAmount !== paidAmount) {
      throw new Error("Cannot close bill. Please confirm payments");
    }

    const updateBill = await AppDataSource.createQueryBuilder()
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

    return updateBill;
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
      bill.updated_at = new Date();
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
      bill.updated_at = new Date();
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
      billItem.updated_at = new Date();

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
    return await this.billItemRepository.manager.transaction(async manager => {
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
        billItem.updated_at = new Date();

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
        bill.updated_at = new Date();
        await manager.save(bill);
      } else {
        // Reject quantity change - revert to pending status
        billItem.status = BillItemStatus.PENDING;
        billItem.quantity_change_approved_by = approvedBy;
        billItem.quantity_change_approved_at = new Date();
        billItem.updated_at = new Date();

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
        bill.updated_at = new Date();
        await manager.save(bill);
      }

      const savedItem = await manager.save(billItem);

      // Send notification to sales person
      try {
        // TODO: Implement notification system
        console.log(`Quantity change request ${approved ? 'approved' : 'rejected'} for item ${itemId} in bill ${billId}`);
      } catch (error) {
        // Don't fail the transaction for notification errors
      }

      return savedItem;
    });
  }
}
