import { DataSource, Repository, Between, In, Not } from "typeorm";
import { Bill, BillStatus } from "@backend/entities/Bill";
import { BillItem, BillItemStatus } from "@backend/entities/BillItem";
import { PurchaseOrder, PurchaseOrderStatus } from "@backend/entities/PurchaseOrder";
import { PurchaseOrderItem } from "@backend/entities/PurchaseOrderItem";
import { BillPayment } from "@backend/entities/BillPayment";
import { Payment, PaymentType } from "@backend/entities/Payment";
import { Item } from "@backend/entities/Item";
import { User } from "@backend/entities/User";
import { Supplier } from "@backend/entities/Supplier";
import { ProductionPreparation, ProductionPreparationStatus } from "@backend/entities/ProductionPreparation";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getAppTimezone } from "../config/timezone";
import { reportPeriodBucketKey } from "../utils/reportPeriodBucket";

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  itemId?: number;
  userId?: number;
  supplierId?: number;
  period?: "day" | "week" | "month" | "year";
}

export interface BillPaymentsReportFilters {
  paymentType?: PaymentType;
  reference?: string;
  paymentDate?: Date;
  userId?: number;
}

export interface SalesRevenueReportItem {
  date: string;
  actualRevenue: number;
  projectedRevenue: number;
  totalRevenue: number;
  billCount: number;
  itemBreakdown?: Array<{
    itemId: number;
    itemName: string;
    actualRevenue: number;
    projectedRevenue: number;
  }>;
  userBreakdown?: Array<{
    userId: number;
    userName: string;
    actualRevenue: number;
    projectedRevenue: number;
  }>;
}

export interface ProductionStockRevenueReportItem {
  date: string;
  productionRevenue: number;
  stockRevenue: number;
  totalRevenue: number;
  itemBreakdown?: Array<{
    itemId: number;
    itemName: string;
    itemType: "production" | "stock";
    revenue: number;
  }>;
}

export interface ItemsSoldCountReportItem {
  date: string;
  itemId: number;
  itemName: string;
  quantity: number;
  userId?: number;
  userName?: string;
}

export interface VoidedItemsReportItem {
  date: string;
  itemId: number;
  itemName: string;
  quantity: number;
  subtotal: number;
  voidReason: string;
  requestedBy: number;
  requestedByName: string;
  approvedBy?: number;
  approvedByName?: string;
  voidRequestedAt: Date;
  voidApprovedAt?: Date;
  billId: number;
}

export interface ExpenditureReportItem {
  date: string;
  supplierId: number;
  supplierName: string;
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  totalAmount: number;
}

export interface InvoicesPendingBillsReportItem {
  date: string;
  type: "invoice" | "pending_bill";
  referenceId: number;
  referenceNumber: string;
  total: number;
  itemBreakdown?: Array<{
    itemId: number;
    itemName: string;
    quantity: number;
    subtotal: number;
  }>;
}

export interface PurchaseOrdersReportItem {
  date: string;
  orderNumber: string;
  supplierId: number;
  supplierName: string;
  status: string;
  totalAmount: number;
  itemBreakdown?: Array<{
    itemId: number;
    itemName: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface PnLReportItem {
  date: string;
  actualRevenue: number;
  projectedRevenue: number;
  totalRevenue: number;
  expenses: number;
  voids: number;
  actualPnL: number;
  projectedPnL: number;
}

export interface ProductionSalesReconciliationReportItem {
  itemId: number;
  itemName: string;
  itemCode?: string;
  quantityIssued: number;
  quantitySold: number;
  quantityVoided: number;
  quantityStale: number; // For future use - can be calculated from inventory transactions
  remainingBalance: number;
  issuedValue: number;
  soldValue: number;
  voidedValue: number;
  details?: {
    issued: Array<{
      date: string;
      quantity: number;
      referenceId: number;
      referenceType: "preparation" | "issue";
    }>;
    sold: Array<{
      date: string;
      quantity: number;
      billId: number;
      billNumber: string;
    }>;
    voided: Array<{
      date: string;
      quantity: number;
      billId: number;
      billNumber: string;
      voidReason: string;
    }>;
  };
}

export interface BillPaymentReportItem {
  billId: number;
  billNumber: string;
  paymentId: number;
  paymentType: PaymentType;
  amount: number;
  reference: string | null;
  paidAt: Date;
  paymentDate: string;
  billedBy?: {
    id: number;
    name: string;
    username: string;
  };
}

export class ReportService {
  private billRepository: Repository<Bill>;
  private billItemRepository: Repository<BillItem>;
  private purchaseOrderRepository: Repository<PurchaseOrder>;
  private purchaseOrderItemRepository: Repository<PurchaseOrderItem>;
  private billPaymentRepository: Repository<BillPayment>;
  private itemRepository: Repository<Item>;
  private userRepository: Repository<User>;
  private supplierRepository: Repository<Supplier>;
  private productionPreparationRepository: Repository<ProductionPreparation>;

  constructor(dataSource: DataSource) {
    this.billRepository = dataSource.getRepository(Bill);
    this.billItemRepository = dataSource.getRepository(BillItem);
    this.purchaseOrderRepository = dataSource.getRepository(PurchaseOrder);
    this.purchaseOrderItemRepository = dataSource.getRepository(PurchaseOrderItem);
    this.billPaymentRepository = dataSource.getRepository(BillPayment);
    this.itemRepository = dataSource.getRepository(Item);
    this.userRepository = dataSource.getRepository(User);
    this.supplierRepository = dataSource.getRepository(Supplier);
    this.productionPreparationRepository = dataSource.getRepository(ProductionPreparation);
  }

  private getDateRange(startDate: Date, endDate: Date, period?: "day" | "week" | "month" | "year"): { start: Date; end: Date } {
    if (!period || period === "day") {
      return { start: startDate, end: endDate };
    }
    const tz = getAppTimezone();
    const zStart = toZonedTime(startDate, tz);
    const zEnd = toZonedTime(endDate, tz);
    if (period === "week") {
      return {
        start: fromZonedTime(startOfWeek(zStart, { weekStartsOn: 1 }), tz),
        end: fromZonedTime(endOfWeek(zEnd, { weekStartsOn: 1 }), tz),
      };
    }
    if (period === "month") {
      return {
        start: fromZonedTime(startOfMonth(zStart), tz),
        end: fromZonedTime(endOfMonth(zEnd), tz),
      };
    }
    if (period === "year") {
      return {
        start: fromZonedTime(startOfYear(zStart), tz),
        end: fromZonedTime(endOfYear(zEnd), tz),
      };
    }
    return { start: startDate, end: endDate };
  }

  private rollupPnLReportByPeriod(rows: PnLReportItem[], period?: ReportFilters["period"]): PnLReportItem[] {
    if (!period || period === "day") {
      return [...rows].sort((a, b) => a.date.localeCompare(b.date));
    }
    const m = new Map<string, PnLReportItem>();
    for (const r of rows) {
      const day = new Date(`${r.date}T12:00:00.000Z`);
      const bucket = reportPeriodBucketKey(day, period);
      const cur = m.get(bucket);
      if (!cur) {
        m.set(bucket, {
          date: bucket,
          actualRevenue: r.actualRevenue,
          projectedRevenue: r.projectedRevenue,
          totalRevenue: r.totalRevenue,
          expenses: r.expenses,
          voids: r.voids,
          actualPnL: r.actualPnL,
          projectedPnL: r.projectedPnL,
        });
      } else {
        cur.actualRevenue += r.actualRevenue;
        cur.projectedRevenue += r.projectedRevenue;
        cur.expenses += r.expenses;
        cur.voids += r.voids;
      }
    }
    return Array.from(m.values())
      .map((report) => {
        report.totalRevenue = report.actualRevenue + report.projectedRevenue;
        report.actualPnL = report.actualRevenue - report.expenses;
        report.projectedPnL = report.totalRevenue - report.expenses;
        return report;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSalesRevenueReport(filters: ReportFilters): Promise<SalesRevenueReportItem[]> {
    const { startDate, endDate, itemId, userId, period } = filters;

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    const { start, end } = this.getDateRange(startDate, endDate, period);

    // Build query for actual revenue (closed bills)
    let actualQuery = this.billRepository
      .createQueryBuilder("bill")
      .leftJoinAndSelect("bill.bill_items", "billItem")
      .leftJoinAndSelect("billItem.item", "item")
      .leftJoinAndSelect("bill.user", "user")
      .where("bill.status = :closedStatus", { closedStatus: BillStatus.CLOSED })
      .andWhere("billItem.status != :voidedStatus", { voidedStatus: BillItemStatus.VOIDED })
      .andWhere("bill.created_at >= :start", { start })
      .andWhere("bill.created_at <= :end", { end });

    // Build query for projected revenue (active bills)
    let projectedQuery = this.billRepository
      .createQueryBuilder("bill")
      .leftJoinAndSelect("bill.bill_items", "billItem")
      .leftJoinAndSelect("billItem.item", "item")
      .leftJoinAndSelect("bill.user", "user")
      .where("bill.status IN (:...activeStatuses)", {
        activeStatuses: [BillStatus.PENDING, BillStatus.SUBMITTED, BillStatus.REOPENED]
      })
      .andWhere("billItem.status != :voidedStatus", { voidedStatus: BillItemStatus.VOIDED })
      .andWhere("bill.created_at >= :start", { start })
      .andWhere("bill.created_at <= :end", { end });

    if (itemId) {
      actualQuery = actualQuery.andWhere("item.id = :itemId", { itemId });
      projectedQuery = projectedQuery.andWhere("item.id = :itemId", { itemId });
    }

    if (userId) {
      actualQuery = actualQuery.andWhere("bill.user_id = :userId", { userId });
      projectedQuery = projectedQuery.andWhere("bill.user_id = :userId", { userId });
    }

    const actualBills = await actualQuery.getMany();
    const projectedBills = await projectedQuery.getMany();

    // Group by calendar period (day / ISO week / month / year) in app timezone
    const reportMap = new Map<string, SalesRevenueReportItem>();

    // Process actual revenue
    actualBills.forEach(bill => {
      const billDate = reportPeriodBucketKey(new Date(bill.created_at), period);
      if (!reportMap.has(billDate)) {
        reportMap.set(billDate, {
          date: billDate,
          actualRevenue: 0,
          projectedRevenue: 0,
          totalRevenue: 0,
          billCount: 0,
          itemBreakdown: [],
          userBreakdown: []
        });
      }

      const report = reportMap.get(billDate)!;
      const billRevenue = bill.bill_items
        ?.filter(item => item.status !== BillItemStatus.VOIDED)
        .reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;

      report.actualRevenue += billRevenue;
      report.totalRevenue += billRevenue;
      report.billCount += 1;
    });

    // Process projected revenue
    projectedBills.forEach(bill => {
      const billDate = reportPeriodBucketKey(new Date(bill.created_at), period);
      if (!reportMap.has(billDate)) {
        reportMap.set(billDate, {
          date: billDate,
          actualRevenue: 0,
          projectedRevenue: 0,
          totalRevenue: 0,
          billCount: 0,
          itemBreakdown: [],
          userBreakdown: []
        });
      }

      const report = reportMap.get(billDate)!;
      const billRevenue = bill.bill_items
        ?.filter(item => item.status !== BillItemStatus.VOIDED)
        .reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;

      report.projectedRevenue += billRevenue;
      report.totalRevenue += billRevenue;
    });

    return Array.from(reportMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getBillPaymentsReport(filters: BillPaymentsReportFilters): Promise<BillPaymentReportItem[]> {
    const { paymentType, reference, paymentDate, userId } = filters;

    let query = this.billPaymentRepository
      .createQueryBuilder("billPayment")
      .leftJoinAndSelect("billPayment.payment", "payment")
      .leftJoinAndSelect("billPayment.bill", "bill")
      .leftJoinAndSelect("bill.user", "user")
      .orderBy("payment.paidAt", "DESC")
      .addOrderBy("billPayment.id", "DESC");

    if (paymentType) {
      query = query.andWhere("payment.payment_type = :paymentType", { paymentType });
    }

    if (reference) {
      query = query.andWhere("LOWER(COALESCE(payment.reference, '')) LIKE :reference", {
        reference: `%${reference.trim().toLowerCase()}%`,
      });
    }

    if (paymentDate) {
      const start = new Date(paymentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(paymentDate);
      end.setHours(23, 59, 59, 999);
      query = query
        .andWhere("payment.paid_at >= :start", { start })
        .andWhere("payment.paid_at <= :end", { end });
    }

    if (userId) {
      query = query.andWhere("bill.user_id = :userId", { userId });
    }

    const rows = await query.getMany();
    return rows
      .filter((row) => !!row.payment && !!row.bill)
      .map((row) => {
        const fullName = row.bill.user
          ? `${row.bill.user.firstName || ""} ${row.bill.user.lastName || ""}`.trim()
          : "";
        return {
          billId: row.bill.id,
          billNumber: row.bill.request_id || `BILL-${row.bill.id}`,
          paymentId: row.payment.id,
          paymentType: row.payment.paymentType,
          amount: Number(row.payment.creditAmount) || 0,
          reference: row.payment.reference || null,
          paidAt: row.payment.paidAt,
          paymentDate: reportPeriodBucketKey(new Date(row.payment.paidAt), "day"),
          billedBy: row.bill.user
            ? {
                id: row.bill.user.id,
                name: fullName || row.bill.user.username || `User #${row.bill.user.id}`,
                username: row.bill.user.username,
              }
            : undefined,
        };
      });
  }

  async getProductionStockRevenueReport(filters: ReportFilters): Promise<ProductionStockRevenueReportItem[]> {
    const { startDate, endDate, itemId, period } = filters;

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    const { start, end } = this.getDateRange(startDate, endDate, period);

    let query = this.billRepository
      .createQueryBuilder("bill")
      .leftJoinAndSelect("bill.bill_items", "billItem")
      .leftJoinAndSelect("billItem.item", "item")
      .where("bill.status = :closedStatus", { closedStatus: BillStatus.CLOSED })
      .andWhere("billItem.status != :voidedStatus", { voidedStatus: BillItemStatus.VOIDED })
      .andWhere("bill.created_at >= :start", { start })
      .andWhere("bill.created_at <= :end", { end });

    if (itemId) {
      query = query.andWhere("item.id = :itemId", { itemId });
    }

    const bills = await query.getMany();

    const reportMap = new Map<string, ProductionStockRevenueReportItem>();

    bills.forEach(bill => {
      const billDate = reportPeriodBucketKey(new Date(bill.created_at), period);

      bill.bill_items?.forEach(billItem => {
        if (billItem.status === BillItemStatus.VOIDED || !billItem.item) return;

        if (!reportMap.has(billDate)) {
          reportMap.set(billDate, {
            date: billDate,
            productionRevenue: 0,
            stockRevenue: 0,
            totalRevenue: 0,
            itemBreakdown: []
          });
        }

        const report = reportMap.get(billDate)!;
        const revenue = billItem.subtotal || 0;
        const isStock = billItem.item.isStock;

        if (isStock) {
          report.stockRevenue += revenue;
        } else {
          report.productionRevenue += revenue;
        }
        report.totalRevenue += revenue;
      });
    });

    return Array.from(reportMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getItemsSoldCountReport(filters: ReportFilters): Promise<ItemsSoldCountReportItem[]> {
    const { startDate, endDate, itemId, userId, period } = filters;

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    const { start, end } = this.getDateRange(startDate, endDate, period);

    let query = this.billItemRepository
      .createQueryBuilder("billItem")
      .leftJoinAndSelect("billItem.bill", "bill")
      .leftJoinAndSelect("billItem.item", "item")
      .leftJoinAndSelect("bill.user", "user")
      .where("bill.status = :closedStatus", { closedStatus: BillStatus.CLOSED })
      .andWhere("billItem.status != :voidedStatus", { voidedStatus: BillItemStatus.VOIDED })
      .andWhere("bill.created_at >= :start", { start })
      .andWhere("bill.created_at <= :end", { end });

    if (itemId) {
      query = query.andWhere("item.id = :itemId", { itemId });
    }

    if (userId) {
      query = query.andWhere("bill.user_id = :userId", { userId });
    }

    const billItems = await query.getMany();

    const reportMap = new Map<string, ItemsSoldCountReportItem>();

    billItems.forEach(billItem => {
      if (!billItem.item || !billItem.bill) return;

      const date = reportPeriodBucketKey(new Date(billItem.bill.created_at), period);
      const uid = billItem.bill.user_id;
      const key = `${date}_${billItem.item.id}_${uid ?? 0}`;

      if (!reportMap.has(key)) {
        const u = billItem.bill.user;
        const displayName = u
          ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || `User #${uid}`
          : uid != null
            ? `User #${uid}`
            : "Unknown";

        reportMap.set(key, {
          date,
          itemId: billItem.item.id,
          itemName: billItem.item.name,
          quantity: 0,
          userId: uid ?? undefined,
          userName: displayName,
        });
      }

      const report = reportMap.get(key)!;
      report.quantity += billItem.quantity || 0;
    });

    return Array.from(reportMap.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.itemId !== b.itemId) return a.itemId - b.itemId;
      return (a.userId ?? 0) - (b.userId ?? 0);
    });
  }

  /**
   * Distinct bill creators who have at least one closed bill — for Items Sold Count filter dropdown.
   * Scoped to report permission instead of full user directory (can_view_user).
   */
  async getItemsSoldCountBillUserOptions(): Promise<
    Array<{ id: number; firstName: string; lastName: string; username: string }>
  > {
    const users = await this.userRepository
      .createQueryBuilder("user")
      .innerJoin(Bill, "bill", "bill.user_id = user.id")
      .where("bill.status = :closed", { closed: BillStatus.CLOSED })
      .select(["user.id", "user.firstName", "user.lastName", "user.username"])
      .distinct(true)
      .orderBy("user.firstName", "ASC")
      .addOrderBy("user.lastName", "ASC")
      .addOrderBy("user.username", "ASC")
      .getMany();

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
    }));
  }

  async getBillPaymentUserOptions(): Promise<
    Array<{ id: number; firstName: string; lastName: string; username: string }>
  > {
    const users = await this.userRepository
      .createQueryBuilder("user")
      .innerJoin(Bill, "bill", "bill.user_id = user.id")
      .innerJoin(BillPayment, "bp", "bp.bill_id = bill.id")
      .innerJoin(Payment, "payment", "payment.id = bp.payment_id")
      .select(["user.id", "user.firstName", "user.lastName", "user.username"])
      .distinct(true)
      .orderBy("user.firstName", "ASC")
      .addOrderBy("user.lastName", "ASC")
      .addOrderBy("user.username", "ASC")
      .getMany();

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
    }));
  }

  async getVoidedItemsReport(filters: ReportFilters): Promise<VoidedItemsReportItem[]> {
    const { startDate, endDate, itemId, userId, period } = filters;

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    const { start, end } = this.getDateRange(startDate, endDate, period);

    let query = this.billItemRepository
      .createQueryBuilder("billItem")
      .leftJoinAndSelect("billItem.bill", "bill")
      .leftJoinAndSelect("billItem.item", "item")
      .where("billItem.status = :voidedStatus", { voidedStatus: BillItemStatus.VOIDED })
      .andWhere("billItem.void_requested_at >= :start", { start })
      .andWhere("billItem.void_requested_at <= :end", { end });

    if (itemId) {
      query = query.andWhere("item.id = :itemId", { itemId });
    }

    if (userId) {
      query = query.andWhere("billItem.void_requested_by = :userId", { userId });
    }

    const billItems = await query.getMany();

    // Fetch user details separately
    const userIds = new Set<number>();
    billItems.forEach(item => {
      if (item.void_requested_by) userIds.add(item.void_requested_by);
      if (item.void_approved_by) userIds.add(item.void_approved_by);
    });

    const users = userIds.size > 0 ? await this.userRepository.find({
      where: { id: In(Array.from(userIds)) }
    }) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const rowMap = new Map<string, VoidedItemsReportItem>();

    billItems.forEach(billItem => {
      const at = billItem.void_requested_at || billItem.created_at;
      const bucket = reportPeriodBucketKey(new Date(at), period);
      const key = `${bucket}|${billItem.item?.id ?? 0}|${billItem.void_requested_by ?? 0}`;
      const requestedBy = userMap.get(billItem.void_requested_by || 0);
      const approvedBy = billItem.void_approved_by ? userMap.get(billItem.void_approved_by) : undefined;
      const requestedByName = requestedBy
        ? `${requestedBy.firstName || ""} ${requestedBy.lastName || ""}`.trim() || "Unknown"
        : "Unknown";
      const approvedByName = approvedBy
        ? `${approvedBy.firstName || ""} ${approvedBy.lastName || ""}`.trim() || undefined
        : undefined;

      const existing = rowMap.get(key);
      if (!existing) {
        rowMap.set(key, {
          date: bucket,
          itemId: billItem.item?.id || 0,
          itemName: billItem.item?.name || "Unknown",
          quantity: billItem.quantity || 0,
          subtotal: billItem.subtotal || 0,
          voidReason: billItem.void_reason || "",
          requestedBy: billItem.void_requested_by || 0,
          requestedByName,
          approvedBy: billItem.void_approved_by,
          approvedByName,
          voidRequestedAt: at,
          voidApprovedAt: billItem.void_approved_at,
          billId: billItem.bill_id || 0,
        });
        return;
      }

      existing.quantity += billItem.quantity || 0;
      existing.subtotal += billItem.subtotal || 0;
      const r2 = billItem.void_reason || "";
      if (r2) {
        if (!existing.voidReason) existing.voidReason = r2;
        else if (!existing.voidReason.split("; ").includes(r2)) {
          existing.voidReason = `${existing.voidReason}; ${r2}`;
        }
      }
      const tNew = at?.getTime() || 0;
      if (tNew > (existing.voidRequestedAt?.getTime() || 0)) {
        existing.voidRequestedAt = at;
        existing.approvedBy = billItem.void_approved_by;
        existing.approvedByName = approvedByName;
        existing.voidApprovedAt = billItem.void_approved_at;
      }
    });

    return Array.from(rowMap.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (b.voidRequestedAt?.getTime() || 0) - (a.voidRequestedAt?.getTime() || 0);
    });
  }

  async getExpenditureReport(filters: ReportFilters): Promise<ExpenditureReportItem[]> {
    const { startDate, endDate, itemId, supplierId, period } = filters;

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    const { start, end } = this.getDateRange(startDate, endDate, period);

    let query = this.purchaseOrderRepository
      .createQueryBuilder("po")
      .leftJoinAndSelect("po.items", "poItem")
      .leftJoinAndSelect("poItem.item", "item")
      .leftJoinAndSelect("po.supplier", "supplier")
      .where("po.status = :receivedStatus", { receivedStatus: PurchaseOrderStatus.RECEIVED })
      .andWhere("po.created_at >= :start", { start })
      .andWhere("po.created_at <= :end", { end })
      .andWhere("item.isStock = :isStock", { isStock: true });

    if (itemId) {
      query = query.andWhere("item.id = :itemId", { itemId });
    }

    if (supplierId) {
      query = query.andWhere("po.supplier_id = :supplierId", { supplierId });
    }

    const purchaseOrders = await query.getMany();

    const agg = new Map<string, ExpenditureReportItem>();

    purchaseOrders.forEach(po => {
      const poDate = reportPeriodBucketKey(new Date(po.created_at), period);

      po.items?.forEach(poItem => {
        if (!poItem.item || !poItem.item.isStock) return;

        const key = `${poDate}|${po.supplier_id ?? 0}|${poItem.item.id}`;
        const qty = poItem.quantity_received || 0;
        const sub = Number(poItem.subtotal) || 0;
        const prev = agg.get(key);
        if (!prev) {
          agg.set(key, {
            date: poDate,
            supplierId: po.supplier_id || 0,
            supplierName: po.supplier?.name || "Unknown",
            itemId: poItem.item.id,
            itemName: poItem.item.name,
            quantity: qty,
            unitPrice: Number(poItem.unit_price) || 0,
            subtotal: sub,
            totalAmount: sub,
          });
        } else {
          prev.quantity += qty;
          prev.subtotal += sub;
          prev.totalAmount = prev.subtotal;
          prev.unitPrice = prev.quantity > 0 ? prev.subtotal / prev.quantity : prev.unitPrice;
        }
      });
    });

    return Array.from(agg.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.supplierId !== b.supplierId) return a.supplierId - b.supplierId;
      return a.itemId - b.itemId;
    });
  }

  async getInvoicesPendingBillsReport(filters: ReportFilters): Promise<InvoicesPendingBillsReportItem[]> {
    const { startDate, endDate, itemId, period } = filters;

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    const { start, end } = this.getDateRange(startDate, endDate, period);

    const results: InvoicesPendingBillsReportItem[] = [];

    // Get invoices (received purchase orders)
    let invoiceQuery = this.purchaseOrderRepository
      .createQueryBuilder("po")
      .leftJoinAndSelect("po.items", "poItem")
      .leftJoinAndSelect("poItem.item", "item")
      .where("po.status = :receivedStatus", { receivedStatus: PurchaseOrderStatus.RECEIVED })
      .andWhere("po.created_at >= :start", { start })
      .andWhere("po.created_at <= :end", { end });

    if (itemId) {
      invoiceQuery = invoiceQuery.andWhere("item.id = :itemId", { itemId });
    }

    const invoices = await invoiceQuery.getMany();

    invoices.forEach(po => {
      const poDate = reportPeriodBucketKey(new Date(po.created_at), period);
      const itemBreakdown = po.items?.map(item => ({
        itemId: item.item?.id || 0,
        itemName: item.item?.name || "Unknown",
        quantity: item.quantity_received || 0,
        subtotal: Number(item.subtotal) || 0
      })) || [];

      results.push({
        date: poDate,
        type: "invoice",
        referenceId: po.id,
        referenceNumber: po.order_number,
        total: Number(po.total_amount) || 0,
        itemBreakdown
      });
    });

    // Get pending bills
    let pendingBillsQuery = this.billRepository
      .createQueryBuilder("bill")
      .leftJoinAndSelect("bill.bill_items", "billItem")
      .leftJoinAndSelect("billItem.item", "item")
      .where("bill.status IN (:...pendingStatuses)", {
        pendingStatuses: [BillStatus.SUBMITTED, BillStatus.REOPENED]
      })
      .andWhere("bill.created_at >= :start", { start })
      .andWhere("bill.created_at <= :end", { end });

    if (itemId) {
      pendingBillsQuery = pendingBillsQuery.andWhere("item.id = :itemId", { itemId });
    }

    const pendingBills = await pendingBillsQuery.getMany();

    pendingBills.forEach(bill => {
      const billDate = reportPeriodBucketKey(new Date(bill.created_at), period);
      const itemBreakdown = bill.bill_items
        ?.filter(item => item.status !== BillItemStatus.VOIDED)
        .map(item => ({
          itemId: item.item?.id || 0,
          itemName: item.item?.name || "Unknown",
          quantity: item.quantity || 0,
          subtotal: item.subtotal || 0
        })) || [];

      results.push({
        date: billDate,
        type: "pending_bill",
        referenceId: bill.id,
        referenceNumber: bill.request_id || `BILL-${bill.id}`,
        total: bill.total || 0,
        itemBreakdown
      });
    });

    return results.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.referenceId - b.referenceId;
    });
  }

  async getPurchaseOrdersReport(filters: ReportFilters): Promise<PurchaseOrdersReportItem[]> {
    const { startDate, endDate, itemId, supplierId, period } = filters;

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    const { start, end } = this.getDateRange(startDate, endDate, period);

    let query = this.purchaseOrderRepository
      .createQueryBuilder("po")
      .leftJoinAndSelect("po.items", "poItem")
      .leftJoinAndSelect("poItem.item", "item")
      .leftJoinAndSelect("po.supplier", "supplier")
      .where("po.created_at >= :start", { start })
      .andWhere("po.created_at <= :end", { end });

    if (itemId) {
      query = query.andWhere("item.id = :itemId", { itemId });
    }

    if (supplierId) {
      query = query.andWhere("po.supplier_id = :supplierId", { supplierId });
    }

    const purchaseOrders = await query.getMany();

    return purchaseOrders.map(po => {
      const poDate = reportPeriodBucketKey(new Date(po.created_at), period);
      const itemBreakdown = po.items?.map(item => ({
        itemId: item.item?.id || 0,
        itemName: item.item?.name || "Unknown",
        quantityOrdered: item.quantity_ordered || 0,
        quantityReceived: item.quantity_received || 0,
        unitPrice: Number(item.unit_price) || 0,
        subtotal: Number(item.subtotal) || 0
      })) || [];

      return {
        date: poDate,
        orderNumber: po.order_number,
        supplierId: po.supplier_id || 0,
        supplierName: po.supplier?.name || "Unknown",
        status: po.status,
        totalAmount: Number(po.total_amount) || 0,
        itemBreakdown
      };
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.orderNumber.localeCompare(b.orderNumber);
    });
  }

  async getPnLReport(filters: ReportFilters): Promise<PnLReportItem[]> {
    const { startDate, endDate, period } = filters;

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    const { start, end } = this.getDateRange(startDate, endDate, period);

    // Get actual revenue (closed bills, non-voided items)
    const actualRevenueQuery = this.billItemRepository
      .createQueryBuilder("billItem")
      .leftJoin("billItem.bill", "bill")
      .where("bill.status = :closedStatus", { closedStatus: BillStatus.CLOSED })
      .andWhere("billItem.status != :voidedStatus", { voidedStatus: BillItemStatus.VOIDED })
      .andWhere("bill.created_at >= :start", { start })
      .andWhere("bill.created_at <= :end", { end })
      .select("DATE(bill.created_at)", "date")
      .addSelect("SUM(billItem.subtotal)", "revenue")
      .groupBy("DATE(bill.created_at)");

    const actualRevenueResults = await actualRevenueQuery.getRawMany();

    // Get projected revenue (active bills, non-voided items)
    const projectedRevenueQuery = this.billItemRepository
      .createQueryBuilder("billItem")
      .leftJoin("billItem.bill", "bill")
      .where("bill.status IN (:...activeStatuses)", {
        activeStatuses: [BillStatus.PENDING, BillStatus.SUBMITTED, BillStatus.REOPENED]
      })
      .andWhere("billItem.status != :voidedStatus", { voidedStatus: BillItemStatus.VOIDED })
      .andWhere("bill.created_at >= :start", { start })
      .andWhere("bill.created_at <= :end", { end })
      .select("DATE(bill.created_at)", "date")
      .addSelect("SUM(billItem.subtotal)", "revenue")
      .groupBy("DATE(bill.created_at)");

    const projectedRevenueResults = await projectedRevenueQuery.getRawMany();

    // Get expenses (received purchase orders)
    const expensesQuery = this.purchaseOrderRepository
      .createQueryBuilder("po")
      .where("po.status = :receivedStatus", { receivedStatus: PurchaseOrderStatus.RECEIVED })
      .andWhere("po.created_at >= :start", { start })
      .andWhere("po.created_at <= :end", { end })
      .select("DATE(po.created_at)", "date")
      .addSelect("SUM(po.total_amount)", "expenses")
      .groupBy("DATE(po.created_at)");

    const expensesResults = await expensesQuery.getRawMany();

    // Get voids (for reference)
    const voidsQuery = this.billItemRepository
      .createQueryBuilder("billItem")
      .leftJoin("billItem.bill", "bill")
      .where("billItem.status = :voidedStatus", { voidedStatus: BillItemStatus.VOIDED })
      .andWhere("billItem.void_requested_at >= :start", { start })
      .andWhere("billItem.void_requested_at <= :end", { end })
      .select("DATE(billItem.void_requested_at)", "date")
      .addSelect("SUM(billItem.subtotal)", "voids")
      .groupBy("DATE(billItem.void_requested_at)");

    const voidsResults = await voidsQuery.getRawMany();

    // Combine results by date
    const reportMap = new Map<string, PnLReportItem>();

    actualRevenueResults.forEach(row => {
      const date = new Date(row.date).toISOString().split("T")[0];
      if (!reportMap.has(date)) {
        reportMap.set(date, {
          date,
          actualRevenue: 0,
          projectedRevenue: 0,
          totalRevenue: 0,
          expenses: 0,
          voids: 0,
          actualPnL: 0,
          projectedPnL: 0
        });
      }
      reportMap.get(date)!.actualRevenue = Number(row.revenue) || 0;
    });

    projectedRevenueResults.forEach(row => {
      const date = new Date(row.date).toISOString().split("T")[0];
      if (!reportMap.has(date)) {
        reportMap.set(date, {
          date,
          actualRevenue: 0,
          projectedRevenue: 0,
          totalRevenue: 0,
          expenses: 0,
          voids: 0,
          actualPnL: 0,
          projectedPnL: 0
        });
      }
      reportMap.get(date)!.projectedRevenue = Number(row.revenue) || 0;
    });

    expensesResults.forEach(row => {
      const date = new Date(row.date).toISOString().split("T")[0];
      if (!reportMap.has(date)) {
        reportMap.set(date, {
          date,
          actualRevenue: 0,
          projectedRevenue: 0,
          totalRevenue: 0,
          expenses: 0,
          voids: 0,
          actualPnL: 0,
          projectedPnL: 0
        });
      }
      reportMap.get(date)!.expenses = Number(row.expenses) || 0;
    });

    voidsResults.forEach(row => {
      const date = new Date(row.date).toISOString().split("T")[0];
      if (!reportMap.has(date)) {
        reportMap.set(date, {
          date,
          actualRevenue: 0,
          projectedRevenue: 0,
          totalRevenue: 0,
          expenses: 0,
          voids: 0,
          actualPnL: 0,
          projectedPnL: 0
        });
      }
      reportMap.get(date)!.voids = Number(row.voids) || 0;
    });

    // Calculate totals and PnL (daily rows), then roll up week/month/year in app TZ
    const daily = Array.from(reportMap.values()).map(report => {
      report.totalRevenue = report.actualRevenue + report.projectedRevenue;
      report.actualPnL = report.actualRevenue - report.expenses;
      report.projectedPnL = report.totalRevenue - report.expenses;
      return report;
    });
    return this.rollupPnLReportByPeriod(daily, period);
  }

  /**
   * Production vs Sales Reconciliation Report
   * Shows issued items against sales/bills with voided items tracking
   * Example: 10 tortillas produced, 8 sold, 1 stale, 1 voided = 1 remaining
   */
  async getProductionSalesReconciliationReport(
    filters: ReportFilters
  ): Promise<ProductionSalesReconciliationReportItem[]> {
    const { startDate, endDate, itemId, period } = filters;

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    const { start, end } = this.getDateRange(startDate, endDate, period);

    // Get all production issues/preparations (issued items)
    let productionQuery = this.productionPreparationRepository
      .createQueryBuilder("prep")
      .leftJoinAndSelect("prep.item", "item")
      .where("prep.status = :status", { status: ProductionPreparationStatus.ISSUED })
      .andWhere("prep.issued_at >= :start", { start })
      .andWhere("prep.issued_at <= :end", { end });

    if (itemId) {
      productionQuery = productionQuery.andWhere("prep.item_id = :itemId", { itemId });
    }

    const productionIssues = await productionQuery.getMany();

    // Get all sold items (from closed/submitted bills, excluding voided items)
    let soldItemsQuery = this.billItemRepository
      .createQueryBuilder("billItem")
      .leftJoinAndSelect("billItem.item", "item")
      .leftJoinAndSelect("billItem.bill", "bill")
      .where("billItem.status != :voidedStatus", { voidedStatus: BillItemStatus.VOIDED })
      .andWhere("bill.status IN (:...billStatuses)", {
        billStatuses: [BillStatus.CLOSED, BillStatus.SUBMITTED],
      })
      .andWhere("bill.created_at >= :start", { start })
      .andWhere("bill.created_at <= :end", { end });

    if (itemId) {
      soldItemsQuery = soldItemsQuery.andWhere("billItem.item_id = :itemId", { itemId });
    }

    const soldItems = await soldItemsQuery.getMany();

    // Get all voided items
    let voidedItemsQuery = this.billItemRepository
      .createQueryBuilder("billItem")
      .leftJoinAndSelect("billItem.item", "item")
      .leftJoinAndSelect("billItem.bill", "bill")
      .where("billItem.status = :voidedStatus", { voidedStatus: BillItemStatus.VOIDED })
      .andWhere("billItem.void_approved_at >= :start", { start })
      .andWhere("billItem.void_approved_at <= :end", { end });

    if (itemId) {
      voidedItemsQuery = voidedItemsQuery.andWhere("billItem.item_id = :itemId", { itemId });
    }

    const voidedItems = await voidedItemsQuery.getMany();

    // Aggregate by item
    const itemMap = new Map<number, ProductionSalesReconciliationReportItem>();

    // Process production issues
    productionIssues.forEach((prep) => {
      const itemId = prep.item_id;
      if (!itemId || !prep.item) return;

      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          itemId,
          itemName: prep.item.name || "Unknown",
          itemCode: prep.item.code || undefined,
          quantityIssued: 0,
          quantitySold: 0,
          quantityVoided: 0,
          quantityStale: 0,
          remainingBalance: 0,
          issuedValue: 0,
          soldValue: 0,
          voidedValue: 0,
          details: {
            issued: [],
            sold: [],
            voided: [],
          },
        });
      }

      const item = itemMap.get(itemId)!;
      item.quantityIssued += prep.quantity_prepared || 0;
      item.details!.issued.push({
        date: prep.issued_at
          ? new Date(prep.issued_at).toISOString().split("T")[0]
          : new Date(prep.created_at).toISOString().split("T")[0],
        quantity: prep.quantity_prepared || 0,
        referenceId: prep.id,
        referenceType: "preparation",
      });
    });

    // Process sold items
    soldItems.forEach((billItem) => {
      const itemId = billItem.item_id;
      if (!itemId || !billItem.item || !billItem.bill) return;

      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          itemId,
          itemName: billItem.item.name || "Unknown",
          itemCode: billItem.item.code || undefined,
          quantityIssued: 0,
          quantitySold: 0,
          quantityVoided: 0,
          quantityStale: 0,
          remainingBalance: 0,
          issuedValue: 0,
          soldValue: 0,
          voidedValue: 0,
          details: {
            issued: [],
            sold: [],
            voided: [],
          },
        });
      }

      const item = itemMap.get(itemId)!;
      const quantity = billItem.quantity || 0;
      const subtotal = Number(billItem.subtotal) || 0;
      item.quantitySold += quantity;
      item.soldValue += subtotal;
      item.details!.sold.push({
        date: new Date(billItem.bill.created_at).toISOString().split("T")[0],
        quantity,
        billId: billItem.bill.id,
        billNumber: billItem.bill.request_id || `BILL-${billItem.bill.id}`,
      });
    });

    // Process voided items
    voidedItems.forEach((billItem) => {
      const itemId = billItem.item_id;
      if (!itemId || !billItem.item || !billItem.bill) return;

      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          itemId,
          itemName: billItem.item.name || "Unknown",
          itemCode: billItem.item.code || undefined,
          quantityIssued: 0,
          quantitySold: 0,
          quantityVoided: 0,
          quantityStale: 0,
          remainingBalance: 0,
          issuedValue: 0,
          soldValue: 0,
          voidedValue: 0,
          details: {
            issued: [],
            sold: [],
            voided: [],
          },
        });
      }

      const item = itemMap.get(itemId)!;
      const quantity = billItem.quantity || 0;
      const subtotal = Number(billItem.subtotal) || 0;
      item.quantityVoided += quantity;
      item.voidedValue += subtotal;
      item.details!.voided.push({
        date: billItem.void_approved_at
          ? new Date(billItem.void_approved_at).toISOString().split("T")[0]
          : new Date(billItem.bill.created_at).toISOString().split("T")[0],
        quantity,
        billId: billItem.bill.id,
        billNumber: billItem.bill.request_id || `BILL-${billItem.bill.id}`,
        voidReason: billItem.void_reason || "No reason provided",
      });
    });

    // Calculate remaining balance and format results
    return Array.from(itemMap.values())
      .map((item) => {
        // Remaining balance = issued - sold - stale
        // Note: Voided items are cancelled bills, so items are returned to inventory and available for sale again
        // Therefore, voided items are NOT subtracted from the balance
        item.remainingBalance =
          item.quantityIssued - item.quantitySold - item.quantityStale;
        return item;
      })
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }
}

