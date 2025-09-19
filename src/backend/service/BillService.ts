import { Bill, BillStatus } from "@entities/Bill";
import { BillItem, BillItemStatus, ItemStatus } from "@entities/BillItem";
import { AppDataSource } from "@backend/config/data-source";
import { UserService } from "./UserService";
import { BillPaymentInterface } from "@backend/interfaces/BillPayment";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getAppTimezone } from "@backend/config/timezone";
import { BillPayment } from "@backend/entities/BillPayment";
import { Payment, PaymentType } from "@backend/entities/Payment";
import { CreditNote } from "@backend/entities/CreditNote";
import { NotificationService } from "./NotificationService";
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
  private notificationService: NotificationService;

  constructor(dataSource: DataSource) {
    this.billRepository = dataSource.getRepository(Bill);
    this.billItemRepository = dataSource.getRepository(BillItem);
    this.paymentRepository = dataSource.getRepository(Payment);
    this.billPaymentRepository = dataSource.getRepository(BillPayment);

    this.userService = new UserService(dataSource);
    this.notificationService = new NotificationService();
  }

  async createBill(payload) {
    const { items, total, user_id, station_id } = payload;

    return await this.billRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const newBill = await transactionalEntityManager.save(Bill, {
          user: { id: user_id },
          station: station_id ? { id: station_id } : undefined,
          total,
          status: BillStatus.PENDING,
          created_by: user_id,
        });

        const billItems = items.map((item) => ({
          item: { id: item.item_id },
          bill: { id: newBill.id },
          quantity: item.quantity,
          subtotal: item.subtotal,
          status: BillItemStatus.SUBMITTED,
        }));

        await transactionalEntityManager.save(BillItem, billItems);

        return newBill;
      },
    );
  }

  async fetchBills(userId: number, billFilter: BillFilter, page = 1, pageSize = 20) {
    const { targetDate, status, billId, billingUserId } = billFilter;
    let startOfDayDate, endOfDayDate;
    if (targetDate) {
      // Database stores timestamps in local timezone, so we can use the date range directly
      startOfDayDate = targetDate;
      endOfDayDate = new Date(targetDate.getTime() + (24 * 60 * 60 * 1000) - 1);
    }

    const currentUser = await this.userService.getUserById(userId);

    const roleNames = ["sales"];
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

      // Get total count before pagination
      const total = await query.getCount();

      // Pagination
      query.skip((page - 1) * pageSize).take(pageSize);

      const bills = await query.getMany();

      return { bills, total };
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

  // Void a specific item from a bill
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

    const paymentPayloads = this.generatePaymentPayloads(billPayment);
    if (!paymentPayloads || paymentPayloads.length === 0) {
      throw new Error("No payment payloads generated");
    }

    // Validate M-Pesa reference uniqueness for all M-Pesa payments
    for (const payload of paymentPayloads) {
      if (payload.paymentType === PaymentType.MPESA && payload.reference) {
        const existingMpesaPayment = await this.paymentRepository.findOne({
          where: {
            paymentType: PaymentType.MPESA,
            reference: payload.reference
          }
        });

        if (existingMpesaPayment) {
          throw new Error(`M-Pesa payment with reference ${payload.reference} already exists`);
        }
      }
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

  async closeBill(billId: number, userId?: number) {
    return await AppDataSource.transaction(async manager => {
      const bill = await manager.findOne(Bill, {
        where: { id: billId },
        relations: ["bill_payments", "bill_payments.payment"]
      });

      if (!bill) {
        throw new Error("Bill not found");
      }

      const billAmount = bill.total;
      const paidAmount = bill.bill_payments.reduce(
        (sum, billPayment) => sum + billPayment.payment.creditAmount,
        0,
      );

      const amountDifference = paidAmount - billAmount;
      let notes = bill.notes || "";

      // Handle overpayment
      if (amountDifference > 0) {
        const overpaymentNote = `Overpayment of $${amountDifference.toFixed(2)} - Customer refund required`;
        notes = notes ? `${notes}\n${overpaymentNote}` : overpaymentNote;

        // Create credit note for overpayment
        const creditNote = new CreditNote();
        creditNote.bill_id = billId;
        creditNote.credit_amount = amountDifference;
        creditNote.reason = "Overpayment";
        creditNote.notes = `Overpayment of $${amountDifference.toFixed(2)} from bill #${billId}`;
        creditNote.status = "pending";
        creditNote.created_by = userId || 0;
        creditNote.created_at = new Date();

        await manager.save(creditNote);
      }

      // Update bill status and notes
      await manager.update(Bill, billId, {
        status: BillStatus.CLOSED,
        notes: notes,
        updated_at: new Date()
      });

      return { success: true, overpayment: amountDifference > 0 ? amountDifference : 0 };
    });
  }

  async closeBillsBulk(billIds: number[], userId?: number) {
    const results = [];
    for (const billId of billIds) {
      try {
        await this.closeBill(billId, userId);
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

  // ===== BILL VOIDING METHODS =====

  /**
   * Request to void a bill item (Rule 4.3, 4.5)
   * Sales users can request voiding of items in submitted/reopened bills
   */
  async requestVoidItem(
    billId: number,
    itemId: number,
    requestedBy: number,
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

    if (bill.status !== BillStatus.SUBMITTED && bill.status !== BillStatus.REOPENED) {
      throw new Error("Bill must be submitted or reopened to void items");
    }

    const billItem = await this.billItemRepository.findOne({
      where: { id: itemId, bill_id: billId }
    });

    if (!billItem) {
      throw new Error("Bill item not found");
    }

    if (!billItem.canVoid(bill)) {
      throw new Error("Item cannot be voided in current state");
    }

    // Update item status to void_pending (Rule 4.7)
    billItem.item_status = ItemStatus.VOID_PENDING;
    billItem.void_reason = reason;
    billItem.void_requested_by = requestedBy;
    billItem.void_requested_at = new Date();
    billItem.updated_at = new Date();

    return await this.billItemRepository.save(billItem);
  }

  /**
   * Approve or reject a void request (Rule 4.3, 4.5)
   * Cashier/supervisor users can approve/reject void requests
   */
  async approveVoidRequest(
    billId: number,
    itemId: number,
    approvedBy: number,
    approved: boolean,
    approvalNotes?: string
  ): Promise<{ billItem: BillItem; bill: Bill }> {
    // Validate business rules (Rule 4.8)
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ["bill_items"]
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    const billItem = await this.billItemRepository.findOne({
      where: { id: itemId, bill_id: billId }
    });

    if (!billItem) {
      throw new Error("Bill item not found");
    }

    if (!billItem.canApproveVoid(bill)) {
      throw new Error("Item void request cannot be approved in current state");
    }

    // Use transaction for atomic operations (Rule 4.8)
    return await this.billRepository.manager.transaction(async manager => {
      // Update item status
      billItem.item_status = approved ? ItemStatus.VOIDED : ItemStatus.ACTIVE;
      billItem.void_approved_by = approvedBy;
      billItem.void_approved_at = new Date();
      billItem.updated_at = new Date();

      const savedBillItem = await manager.save(billItem);

      // Update bill status based on item states (Rule 4.7)
      const newBillStatus = bill.calculateBillStatus();
      if (newBillStatus !== bill.status) {
        bill.status = newBillStatus;
        bill.updated_at = new Date();
        bill.updated_by = approvedBy;
        await manager.save(bill);
      }

      return { billItem: savedBillItem, bill };
    });
  }

  /**
   * Get pending void requests for a bill (Rule 4.6)
   */
  async getPendingVoidRequests(billId: number): Promise<BillItem[]> {
    return await this.billItemRepository.find({
      where: {
        bill_id: billId,
        item_status: ItemStatus.VOID_PENDING
      },
      relations: ["item", "bill"]
    });
  }

  /**
   * Get void request history for a bill (Rule 4.6)
   */
  async getVoidHistory(billId: number): Promise<BillItem[]> {
    return await this.billItemRepository.find({
      where: {
        bill_id: billId,
        item_status: ItemStatus.VOIDED
      },
      relations: ["item", "bill"],
      order: { void_approved_at: "DESC" }
    });
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
        await this.notificationService.createBillReopenedNotification(
          billId,
          bill.user_id,
          reopenedBy,
          reasonKey
        );
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
        // Find the user who originally reopened the bill
        const reopenedByUser = await this.userService.getUserById(bill.reopened_by);
        if (reopenedByUser) {
          await this.notificationService.createBillResubmittedNotification(
            billId,
            reopenedByUser.id,
            resubmittedBy,
            notes
          );
        }
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Don't fail the transaction for notification errors
      }

      return savedBill;
    });
  }

  /**
   * Get reopened bills for sales persons (Rule 4.6)
   */
  async getReopenedBills(): Promise<Bill[]> {
    return await this.billRepository.find({
      where: { status: BillStatus.REOPENED },
      relations: ["user", "bill_payments", "bill_payments.payment"],
      order: { reopened_at: "DESC" }
    });
  }

  /**
   * Add payment to a bill
   */
  async addPayment(billId: number, paymentData: any, userId: number): Promise<any> {
    return await this.billRepository.manager.transaction(async manager => {
      // Get the bill
      const bill = await manager.findOne(Bill, {
        where: { id: billId },
        relations: ["bill_payments", "bill_payments.payment"]
      });

      if (!bill) {
        throw new Error("Bill not found");
      }

      // Validate M-Pesa reference uniqueness
      if (paymentData.paymentType === PaymentType.MPESA && paymentData.mpesaTransactionId) {
        const existingMpesaPayment = await manager.findOne(Payment, {
          where: {
            paymentType: PaymentType.MPESA,
            reference: paymentData.mpesaTransactionId
          }
        });

        if (existingMpesaPayment) {
          throw new Error(`M-Pesa payment with reference ${paymentData.mpesaTransactionId} already exists`);
        }
      }

      // Create payment record
      const payment = new Payment();
      payment.paymentType = paymentData.paymentType;
      payment.creditAmount = paymentData.creditAmount;
      payment.reference = paymentData.mpesaTransactionId || `CASH-${Date.now()}`;
      payment.created_by = userId;
      payment.created_at = new Date();

      const savedPayment = await manager.save(payment);

      // Create bill payment relationship
      const billPayment = new BillPayment();
      billPayment.bill = bill;
      billPayment.payment = savedPayment;
      billPayment.created_by = userId;
      billPayment.created_at = new Date();

      await manager.save(billPayment);

      return savedPayment;
    });
  }
}
