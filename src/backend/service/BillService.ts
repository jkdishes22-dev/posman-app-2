import { Bill, BillStatus } from "@entities/Bill";
import { BillItem, BillItemStatus } from "@entities/BillItem";
import { AppDataSource } from "@backend/config/data-source";

export class BillService {
  private billRepository = AppDataSource.getRepository(Bill);
  private billItemRepository = AppDataSource.getRepository(BillItem);

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
        item_id: item.item_id,
        bill_id: savedBill.id,
        quantity: item.quantity,
        subtotal: item.subtotal,
        status: BillItemStatus.SUBMITTED,
      });
    });

    await this.billItemRepository.save(billItems);
    return savedBill;
  }

  async fetchBills() {
    return this.billRepository.find({ relations: ["bill_items"] });
  }
}
