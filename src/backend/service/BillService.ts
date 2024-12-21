import { Bill, BillStatus } from "@entities/Bill";
import { BillItem, BillItemStatus } from "@entities/BillItem";
import { AppDataSource } from "@backend/config/data-source";
import { Between } from "typeorm";
import { UserService } from "./UserService";
import { plainToClass } from "class-transformer";

export class BillService {
  private billRepository = AppDataSource.getRepository(Bill);
  private billItemRepository = AppDataSource.getRepository(BillItem);

  private userService: UserService

  constructor() {
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


  async fetchBills(userId: number, { targetDate, status, billId }: { targetDate: Date; status?: string, billId? :number }) {
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const currentUser = await this.userService.getUserById(userId);

    const roleNames = ['user', 'waitress'];
    const hasRole = currentUser.roles.some(role => roleNames.includes(role.name));

    const whereClause: any = {
      created_at: Between(startOfDay, endOfDay),
    };

    if (hasRole) {
      const user = { id: userId };
      whereClause.user = user;
    }

    if (status) {
      whereClause.status = status;
    }

    if(billId) {
      whereClause.id = billId;
    }

    let bills = await this.billRepository.find({
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
    return this.billRepository.save(bill);
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

  async submitBill() {
    
  }
}
