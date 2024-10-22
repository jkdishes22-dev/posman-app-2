import { Bill, BillStatus } from "@entities/Bill";
import { BillItem, BillItemStatus } from "@entities/BillItem";
import { AppDataSource } from "@backend/config/data-source";
import { Between } from "typeorm";

export class BillService {
  private billRepository = AppDataSource.getRepository(Bill);
  private billItemRepository = AppDataSource.getRepository(BillItem);

  // Create a new bill with bill items
  async createBill(payload) {
    const { items, total, user_id } = payload;
    const newBill = this.billRepository.create({
      user_id,
      total,
      status: BillStatus.SUBMITTED,
      created_by: user_id,
    });

    const savedBill = await this.billRepository.save(newBill);

    const billItems = items.map((item) => {
      return this.billItemRepository.create({
        item: { id: item.item_id }, // Properly reference the item by id
        bill: { id: savedBill.id },  // Properly reference the bill by id
        quantity: item.quantity,
        subtotal: item.subtotal,
        status: BillItemStatus.SUBMITTED,
      });
    });

    await this.billItemRepository.save(billItems);
    return savedBill;
  }

  // Fetch bills for a user filtered by a single date
  async fetchBillsByDate(userId: number, date: Date) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    return this.billRepository.find({
      where: {
        user_id: userId,
        created_at: Between(startOfDay, endOfDay),
      },
      relations: ["bill_items", "bill_items.item"],
      order: { created_at: "DESC" },
    });
  }

  // Cancel a bill by updating its status
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
      item.price AS item_price
    FROM 
      bill_item
    JOIN 
      item ON bill_item.item_id = item.id
    WHERE 
      bill_item.bill_id = ?
  `;

    return await AppDataSource.query(query, [billId]);
  }
}
