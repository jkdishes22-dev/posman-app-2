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

  private normalizeReference(reference: string | null | undefined): string | null {
    if (!reference) {
      return null;
    }
    const normalized = reference.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  async checkMpesaReferenceExists(reference: string, _billId?: number): Promise<boolean> {
    const normalizedReference = this.normalizeReference(reference);
    if (!normalizedReference) {
      return false;
    }

    const existingCount = await this.paymentRepository
      .createQueryBuilder("payment")
      .where("payment.payment_type = :paymentType", { paymentType: PaymentType.MPESA })
      .andWhere("UPPER(TRIM(payment.reference)) = :normalizedReference", {
        normalizedReference,
      })
      .getCount();

    return existingCount > 0;
  }
}
