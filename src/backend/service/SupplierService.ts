import { Supplier, SupplierStatus } from "@backend/entities/Supplier";
import { SupplierTransaction, SupplierTransactionType, SupplierReferenceType } from "@backend/entities/SupplierTransaction";
import { DataSource, Repository } from "typeorm";

export interface SupplierBalance {
    debit_balance: number;
    credit_balance: number;
    available_credit: number; // credit_limit - debit_balance
}

export class SupplierService {
    private supplierRepository: Repository<Supplier>;
    private supplierTransactionRepository: Repository<SupplierTransaction>;

    constructor(dataSource: DataSource) {
        this.supplierRepository = dataSource.getRepository(Supplier);
        this.supplierTransactionRepository = dataSource.getRepository(SupplierTransaction);
    }

    /**
     * Create a new supplier
     */
    public async createSupplier(data: {
        name: string;
        contact_person?: string;
        email?: string;
        phone?: string;
        address?: string;
        credit_limit?: number;
        payment_terms?: string;
    }, userId: number): Promise<Supplier> {
        const supplier = this.supplierRepository.create({
            ...data,
            credit_limit: data.credit_limit || 0,
            status: SupplierStatus.ACTIVE,
            created_by: userId,
        });
        return await this.supplierRepository.save(supplier);
    }

    /**
     * Update supplier information
     */
    public async updateSupplier(id: number, data: Partial<{
        name: string;
        contact_person: string;
        email: string;
        phone: string;
        address: string;
        credit_limit: number;
        payment_terms: string;
        status: SupplierStatus;
    }>, userId: number): Promise<Supplier> {
        await this.supplierRepository.update(id, {
            ...data,
            updated_by: userId,
            updated_at: new Date(),
        });
        const supplier = await this.supplierRepository.findOne({ where: { id } });
        if (!supplier) {
            throw new Error(`Supplier with id ${id} not found`);
        }
        return supplier;
    }

    /**
     * Soft delete supplier (set status to inactive)
     */
    public async deleteSupplier(id: number, userId: number): Promise<void> {
        await this.supplierRepository.update(id, {
            status: SupplierStatus.INACTIVE,
            updated_by: userId,
            updated_at: new Date(),
        });
    }

    /**
     * Fetch all active suppliers
     */
    public async fetchSuppliers(): Promise<Supplier[]> {
        return await this.supplierRepository
            .createQueryBuilder("supplier")
            .where("supplier.status = :status", { status: SupplierStatus.ACTIVE })
            .select([
                "supplier.id",
                "supplier.name",
                "supplier.contact_person",
                "supplier.email",
                "supplier.phone",
                "supplier.address",
                "supplier.credit_limit",
                "supplier.payment_terms",
                "supplier.status",
                "supplier.created_at",
                "supplier.updated_at",
            ])
            .orderBy("supplier.name", "ASC")
            .getMany();
    }

    /**
     * Fetch supplier by ID with purchase history
     */
    public async fetchSupplierById(id: number): Promise<Supplier | null> {
        return await this.supplierRepository.findOne({
            where: { id },
            relations: [], // Can add relations if needed
        });
    }

    /**
     * Calculate supplier balance from transactions
     */
    public async getSupplierBalance(supplierId: number): Promise<SupplierBalance> {
        const result = await this.supplierTransactionRepository
            .createQueryBuilder("transaction")
            .select("SUM(transaction.debit_amount)", "total_debit")
            .addSelect("SUM(transaction.credit_amount)", "total_credit")
            .where("transaction.supplier_id = :supplierId", { supplierId })
            .getRawOne();

        const debit_balance = parseFloat(result?.total_debit || "0") - parseFloat(result?.total_credit || "0");
        const credit_balance = parseFloat(result?.total_credit || "0") - parseFloat(result?.total_debit || "0");

        // Get credit limit
        const supplier = await this.supplierRepository.findOne({ where: { id: supplierId } });
        const credit_limit = supplier?.credit_limit || 0;
        const available_credit = Math.max(0, credit_limit - debit_balance);

        return {
            debit_balance: Math.max(0, debit_balance),
            credit_balance: Math.max(0, credit_balance),
            available_credit,
        };
    }

    /**
     * Create a supplier transaction (used internally by other services)
     */
    public async createSupplierTransaction(
        supplierId: number,
        transactionType: SupplierTransactionType,
        debitAmount: number,
        creditAmount: number,
        referenceType: SupplierReferenceType | null,
        referenceId: number | null,
        notes: string | null,
        userId: number
    ): Promise<SupplierTransaction> {
        const transaction = this.supplierTransactionRepository.create({
            supplier_id: supplierId,
            transaction_type: transactionType,
            debit_amount: debitAmount,
            credit_amount: creditAmount,
            reference_type: referenceType,
            reference_id: referenceId,
            notes,
            created_by: userId,
        });
        return await this.supplierTransactionRepository.save(transaction);
    }

    /**
     * Get supplier transaction history
     */
    public async getSupplierTransactions(
        supplierId: number,
        limit: number = 100
    ): Promise<SupplierTransaction[]> {
        return await this.supplierTransactionRepository
            .createQueryBuilder("transaction")
            .where("transaction.supplier_id = :supplierId", { supplierId })
            .orderBy("transaction.created_at", "DESC")
            .limit(limit)
            .getMany();
    }
}

