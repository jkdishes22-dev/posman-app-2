import { Supplier, SupplierStatus } from "@backend/entities/Supplier";
import { SupplierTransaction, SupplierTransactionType, SupplierReferenceType } from "@backend/entities/SupplierTransaction";
import { DataSource, Repository } from "typeorm";
import { cache } from "@backend/utils/cache";

export interface SupplierBalance {
    debit_balance: number;
    credit_balance: number;
    available_credit: number; // credit_limit - debit_balance
    /** Positive when we owe the supplier more than they owe us (debit balance minus credit balance). */
    net_balance: number;
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
    const saved = await this.supplierRepository.save(supplier);
    
    // Invalidate cache after creating supplier
    cache.invalidate("suppliers");
    
    return saved;
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
        
        // Invalidate cache after updating supplier
        cache.invalidateMany(["suppliers", `supplier_${id}`, `supplier_balance_${id}`]);
        
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
        
        // Invalidate cache after deleting supplier
        cache.invalidateMany(["suppliers", `supplier_${id}`, `supplier_balance_${id}`]);
    }

    /**
     * Fetch all active suppliers
     */
    public async fetchSuppliers(): Promise<Supplier[]> {
        const cacheKey = "suppliers_active";

        // Try cache first (10 min TTL — supplier list is stable reference data)
        const cached = cache.get<Supplier[]>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const result = await this.supplierRepository
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

        // Cache the result
        cache.set(cacheKey, result, 600000); // 10 minutes
        return result;
    }

    /**
     * Fetch supplier by ID with purchase history
     */
    public async fetchSupplierById(id: number): Promise<Supplier | null> {
        const cacheKey = `supplier_${id}`;
        
        // Try cache first
        const cached = cache.get<Supplier | null>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const result = await this.supplierRepository.findOne({
            where: { id },
            relations: [], // Can add relations if needed
        });

        // Cache the result
        cache.set(cacheKey, result);
        return result;
    }

    /**
     * Calculate supplier balance from transactions
     */
    public async getSupplierBalance(supplierId: number): Promise<SupplierBalance> {
        const cacheKey = `supplier_balance_${supplierId}`;
        
        // Try cache first (balance changes frequently, but cache for performance)
        const cached = cache.get<SupplierBalance>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const result = await this.supplierTransactionRepository
            .createQueryBuilder("transaction")
            .select("SUM(transaction.debit_amount)", "total_debit")
            .addSelect("SUM(transaction.credit_amount)", "total_credit")
            .where("transaction.supplier_id = :supplierId", { supplierId })
            .getRawOne();

        const debit_balance = parseFloat(result?.total_debit || "0") - parseFloat(result?.total_credit || "0");
        const credit_balance = parseFloat(result?.total_credit || "0") - parseFloat(result?.total_debit || "0");

        const supplier = await this.supplierRepository.findOne({ where: { id: supplierId } });
        const credit_limit = supplier?.credit_limit || 0;
        const available_credit = Math.max(0, credit_limit - debit_balance);

        const d = Math.max(0, debit_balance);
        const c = Math.max(0, credit_balance);
        const balance: SupplierBalance = {
            debit_balance: d,
            credit_balance: c,
            available_credit,
            net_balance: d - c,
        };

        // Cache the result
        cache.set(cacheKey, balance);
        return balance;
    }

    /**
     * Record a credit against supplier debit (payment or manual adjustment).
     * Reduces debit_balance by increasing credit_amount on the ledger.
     */
    public async recordSupplierCreditTransaction(
        supplierId: number,
        kind: "payment" | "adjustment",
        amount: number,
        userId: number,
        options?: { notes?: string; externalReference?: string },
    ): Promise<SupplierTransaction> {
        const supplier = await this.supplierRepository.findOne({ where: { id: supplierId } });
        if (!supplier) {
            throw new Error(`Supplier with id ${supplierId} not found`);
        }

        const round2 = (n: number) => Math.round(Number(n) * 100) / 100;
        const amt = round2(amount);
        if (amt <= 0) {
            throw new Error("Amount must be positive");
        }

        if (kind === "adjustment" && !String(options?.notes ?? "").trim()) {
            throw new Error("Reason is required for adjustments");
        }

        const balance = await this.getSupplierBalance(supplierId);
        const debitOutstanding = round2(balance.debit_balance);
        if (debitOutstanding <= 0) {
            throw new Error("No outstanding debit balance to clear");
        }
        if (amt > debitOutstanding) {
            throw new Error("Amount exceeds outstanding debit balance");
        }

        const noteParts: string[] = [];
        if (options?.externalReference?.trim()) {
            noteParts.push(`Ref: ${options.externalReference.trim()}`);
        }
        if (options?.notes?.trim()) {
            noteParts.push(options.notes.trim());
        }
        const noteText =
            noteParts.length > 0
                ? noteParts.join(" — ")
                : kind === "payment"
                  ? "Payment recorded"
                  : "Balance adjustment";

        const transactionType =
            kind === "payment" ? SupplierTransactionType.PAYMENT : SupplierTransactionType.ADJUSTMENT;
        const referenceType =
            kind === "payment" ? SupplierReferenceType.PAYMENT : SupplierReferenceType.ADJUSTMENT;

        return this.createSupplierTransaction(
            supplierId,
            transactionType,
            0,
            amt,
            referenceType,
            null,
            noteText,
            userId,
        );
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
        const saved = await this.supplierTransactionRepository.save(transaction);

        // Invalidate cache after creating transaction (affects balance and history)
        cache.invalidateMany([`supplier_balance_${supplierId}`, `supplier_transactions_${supplierId}`]);

        return saved;
    }

    /**
     * Get supplier transaction history
     */
    public async getSupplierTransactions(
        supplierId: number,
        limit: number = 100
    ): Promise<SupplierTransaction[]> {
        const cacheKey = `supplier_transactions_${supplierId}_${limit}`;
        
        // Try cache first (transactions change frequently, but cache for performance)
        const cached = cache.get<SupplierTransaction[]>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const result = await this.supplierTransactionRepository
            .createQueryBuilder("transaction")
            .where("transaction.supplier_id = :supplierId", { supplierId })
            .orderBy("transaction.created_at", "DESC")
            .limit(limit)
            .getMany();

        // Cache the result
        cache.set(cacheKey, result);
        return result;
    }

    /**
     * Paginated supplier transaction ledger (all suppliers or filtered).
     * Not cached — filter combinations are unbounded.
     */
    public async listSupplierTransactionsPaginated(options: {
        supplierId?: number;
        transactionType?: SupplierTransactionType;
        startDate?: Date;
        endDate?: Date;
        page: number;
        pageSize: number;
    }): Promise<{ items: SupplierTransaction[]; total: number }> {
        const page = Math.max(1, Math.floor(options.page));
        const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize)));
        const skip = (page - 1) * pageSize;

        const qb = this.supplierTransactionRepository
            .createQueryBuilder("transaction")
            .leftJoinAndSelect("transaction.supplier", "supplier");

        if (options.supplierId != null && Number.isFinite(options.supplierId)) {
            qb.andWhere("transaction.supplier_id = :supplierId", { supplierId: options.supplierId });
        }

        if (options.transactionType) {
            qb.andWhere("transaction.transaction_type = :tt", { tt: options.transactionType });
        }

        if (options.startDate) {
            qb.andWhere("transaction.created_at >= :startDate", { startDate: options.startDate });
        }

        if (options.endDate) {
            qb.andWhere("transaction.created_at <= :endDate", { endDate: options.endDate });
        }

        const total = await qb.clone().getCount();

        const items = await qb
            .orderBy("transaction.created_at", "DESC")
            .skip(skip)
            .take(pageSize)
            .getMany();

        return { items, total };
    }
}

