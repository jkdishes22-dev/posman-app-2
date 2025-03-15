import { BillPayment } from "@backend/entities/BillPayment";
import { Payment } from "@backend/entities/Payment";
import Container, { Inject } from "typedi";
import { Repository, DataSource } from "typeorm";

export class PaymentService {

    private paymentRepository: Repository<Payment>;
    private billPaymentRepository: Repository<BillPayment>;

  private dataSource = Container.get<DataSource>('DATA_SOURCE');
      
constructor() {
        this.paymentRepository = this.dataSource.getRepository(Payment);
        this.billPaymentRepository = this.dataSource.getRepository(BillPayment);
     }
     
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
