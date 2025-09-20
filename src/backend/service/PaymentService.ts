import { BillPayment } from "@backend/entities/BillPayment";
import { Payment, PaymentType } from "@backend/entities/Payment";
import { Repository, DataSource } from "typeorm";

export class PaymentService {
  private paymentRepository: Repository<Payment>;
  private billPaymentRepository: Repository<BillPayment>;

  constructor(datasource: DataSource) {
    this.paymentRepository = datasource.getRepository(Payment);
    this.billPaymentRepository = datasource.getRepository(BillPayment);
  }

  async createPayment(payload): Promise<Payment | any> {
    const newPayment = this.paymentRepository.create({
      ...payload,
    });

    const payment = await this.paymentRepository.save(newPayment);
    return payment;
  }
  async createBillPayment(payload): Promise<BillPayment | any> {
    const newBillPayment = this.billPaymentRepository.create({
      ...payload,
    });
    const billPayment = await this.billPaymentRepository.save(newBillPayment);
    return billPayment;
  }

  async checkMpesaReferenceExists(reference: string, billId: number): Promise<boolean> {
    // Check if reference already exists for M-Pesa payments
    const existingPayment = await this.paymentRepository.findOne({
      where: {
        reference: reference.trim(),
        paymentType: PaymentType.MPESA
      },
      relations: ["bill_payments", "bill_payments.bill"]
    });

    if (!existingPayment) {
      return false;
    }

    // Check if this reference is used in a different bill
    const billPayments = await existingPayment.bill_payments;
    return billPayments.some(bp => bp.bill && bp.bill.id !== billId);
  }
}
