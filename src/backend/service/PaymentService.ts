import { AppDataSource } from "@backend/config/data-source";
import { BillPayment } from "@backend/entities/BillPayment";
import { Payment, PaymentType } from "@backend/entities/Payment";
import { BillPaymentInterface } from "@backend/interfaces/BillPayment";

export class PaymentService {

    private paymentRepository = AppDataSource.getRepository(Payment);
    private billPaymentRepository = AppDataSource.getRepository(BillPayment);

    constructor() { }
    async createPayment(payload): Promise<Payment> {
        const newPayment = this.paymentRepository.create({
            ...payload
        });

        const payment = await this.paymentRepository.save(newPayment);
        return payment;
    }
    async createBillPayment(payload): Promise<BillPayment> {
        const newBillPayment = this.billPaymentRepository.create({
            ...payload
        });
        const billPayment = await this.billPaymentRepository.save(newBillPayment);
        return billPayment;
    }

  
}
