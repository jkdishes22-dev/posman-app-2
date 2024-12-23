import { Bill, BillStatus } from "@entities/Bill";
import { BillItem, BillItemStatus } from "@entities/BillItem";
import { AppDataSource } from "@backend/config/data-source";
import { Between, Repository } from "typeorm";
import { UserService } from "./UserService";
import { PaymentService } from "./PaymentService";
import { BillPaymentInterface } from "@backend/interfaces/BillPayment";
import { startOfDay, endOfDay } from "date-fns";
import { BillPayment } from "@backend/entities/BillPayment";
import { Payment, PaymentType } from "@backend/entities/Payment";
import { Service } from "typedi";

@Service()
export class BillService {
  private billRepository: Repository<Bill>;
  private billItemRepository: Repository<BillItem>;
  private paymentRepository: Repository<Payment>;
  private billPaymentRepository: Repository<BillPayment>;

  private userService: UserService;

  constructor() {
    this.billRepository = AppDataSource.getRepository(Bill);
    this.billItemRepository = AppDataSource.getRepository(BillItem);
    this.paymentRepository = AppDataSource.getRepository(Payment);
    this.billPaymentRepository = AppDataSource.getRepository(BillPayment);

    this.userService = new UserService();
  }

  async createBill(payload) {
    const { items, total, user_id } = payload;
    const user = { id: user_id };

    const newBill = this.billRepository.create({
      user,
      total,
      status: BillStatus.PENDING,
      created_by: user_id,
    });

    const savedBill = await this.billRepository.save(newBill);

    const billItems = items.map((item) => {
      return this.billItemRepository.create({
        item: { id: item.item_id },
        bill: { id: savedBill.id },
        quantity: item.quantity,
        subtotal: item.subtotal,
        status: BillItemStatus.SUBMITTED,
      });
    });

    await this.billItemRepository.save(billItems);
    return savedBill;
  }


  async fetchBills(userId: number, { targetDate, status, billId }: { targetDate: Date; status?: string, billId?: number }) {
    const startOfDayDate = startOfDay(new Date(targetDate));
    const endOfDayDate = endOfDay(new Date(targetDate));

    const currentUser = await this.userService.getUserById(userId);

    const roleNames = ['user', 'waitress'];
    const hasRole = currentUser.roles.some(role => roleNames.includes(role.name));

    const whereClause: any = {
      created_at: Between(startOfDayDate, endOfDayDate),
    };

    if (hasRole) {
      const user = { id: userId };
      whereClause.user = user;
    }

    if (status) {
      whereClause.status = status;
    }

    if (billId) {
      whereClause.id = billId;
    }

    const bills = await this.billRepository.find({
      where: whereClause,
      relations: ["bill_items", "bill_items.item", "user"],
      order: { created_at: "DESC" },
    });

    return bills;
  }

  async cancelBill(billId: number) {
    const bill = await this.billRepository.findOne({ where: { id: billId } });

    if (!bill) {
      throw new Error("Bill not found");
    }

    bill.status = BillStatus.CANCELLED;
    return repo.save(bill);
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
    return this.billItemRepository.save(billItem);
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
  
    const bill = await this.billRepository.findOneBy({ id: billPayment.billId });
    if (!bill) {
      throw new Error(`Bill with ID ${billPayment.billId} not found`);
    }
  
   console.log("Bill " + JSON.stringify(bill));

   console.log("billPayment " + JSON.stringify(billPayment))
    const paymentPayloads = this.generatePaymentPayloads(billPayment);
    if (!paymentPayloads || paymentPayloads.length === 0) {
      throw new Error("No payment payloads generated");
    }
  
    try {
      return await AppDataSource.transaction(async (transactionalEntityManager) => {
        const payments = [];
        const billPayments = [];
  
        for (const payload of paymentPayloads) {
          const payment: Payment = this.paymentRepository.create(
            payload
          )
          const savedPayment = await transactionalEntityManager.save(Payment, payment);
          payments.push(savedPayment);
  
          const billPaymentPayload = {
            payment: { id: savedPayment.id }, 
            bill: {id: bill.id },
            created_by: payload.created_by,
          };
  
          const newBillPayment = this.billPaymentRepository.create(
            billPaymentPayload
          );
          const savedBillPayment = await transactionalEntityManager.save(BillPayment, newBillPayment);
          billPayments.push(savedBillPayment);
        }
  
        bill.status = BillStatus.SUBMITTED;
        await transactionalEntityManager.save(Bill, bill);
        return {
          bill_payments: billPayments,
          payments,
          bill,
        };
      });
    } catch (error) {
      console.error("Error submitting bill:", error.message);
      throw new Error("Failed to submit bill. Please try again.");
    }
  }
  

  private generatePaymentPayloads(billPayment: BillPaymentInterface): Payment[] {
    const { userId, paymentMethod, cashAmount, mpesaAmount, mpesaCode } = billPayment;

    const paymentMap = {
      'cash_mpesa': [
        { creditAmount: cashAmount, paymentType: PaymentType.CASH },
        { creditAmount: mpesaAmount, paymentType: PaymentType.MPESA, reference: mpesaCode }
      ],
      'cash': [
        { creditAmount: cashAmount, paymentType: PaymentType.CASH }
      ],
      'mpesa': [
        { creditAmount: mpesaAmount, paymentType: PaymentType.MPESA, reference: mpesaCode }
      ]
    };

    return (paymentMap[paymentMethod] || []).map((payment: any) => ({
      ...payment,
      created_by: userId
    }));
  }
}
