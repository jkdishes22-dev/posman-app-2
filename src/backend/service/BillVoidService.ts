import { DataSource, Repository } from "typeorm";
import { BillVoidRequest, VoidRequestStatus } from "../entities/BillVoidRequest";
import { Bill, BillStatus } from "../entities/Bill";
import { BillItem, BillItemStatus } from "../entities/BillItem";
import { User } from "../entities/User";

export class BillVoidService {
  private billVoidRequestRepository: Repository<BillVoidRequest>;
  private billRepository: Repository<Bill>;
  private billItemRepository: Repository<BillItem>;
  private userRepository: Repository<User>;

  constructor(private dataSource: DataSource) {
    this.billVoidRequestRepository = this.dataSource.getRepository(BillVoidRequest);
    this.billRepository = this.dataSource.getRepository(Bill);
    this.billItemRepository = this.dataSource.getRepository(BillItem);
    this.userRepository = this.dataSource.getRepository(User);
  }

  /**
   * Create a void request for a bill
   */
  async createVoidRequest(
    billId: number,
    initiatedBy: number,
    reason: string
  ): Promise<BillVoidRequest> {
    // Check if bill exists and is in a voidable state
    const bill = await this.billRepository.findOne({
      where: { id: billId },
      relations: ["user", "station"],
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    if (bill.status === BillStatus.VOIDED) {
      throw new Error("Bill is already voided");
    }

    if (bill.status === BillStatus.CLOSED) {
      throw new Error("Cannot void a closed bill");
    }

    // Check if there's already a pending void request for this bill
    const existingRequest = await this.billVoidRequestRepository.findOne({
      where: {
        bill_id: billId,
        status: VoidRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new Error("There is already a pending void request for this bill");
    }

    // Create the void request
    const voidRequest = this.billVoidRequestRepository.create({
      bill_id: billId,
      initiated_by: initiatedBy,
      reason: reason,
      status: VoidRequestStatus.PENDING,
    });

    return await this.billVoidRequestRepository.save(voidRequest);
  }

  /**
   * Approve a void request
   */
  async approveVoidRequest(
    requestId: number,
    approvedBy: number,
    approvalNotes?: string,
    paperApprovalReceived: boolean = false,
    paperApprovalNotes?: string
  ): Promise<BillVoidRequest> {
    const voidRequest = await this.billVoidRequestRepository.findOne({
      where: { id: requestId },
      relations: ["bill", "initiator", "approver"],
    });

    if (!voidRequest) {
      throw new Error("Void request not found");
    }

    if (voidRequest.status !== VoidRequestStatus.PENDING) {
      throw new Error("Void request is not in pending status");
    }

    // Update the void request
    voidRequest.status = VoidRequestStatus.APPROVED;
    voidRequest.approved_by = approvedBy;
    voidRequest.approved_at = new Date();
    voidRequest.approval_notes = approvalNotes;
    voidRequest.paper_approval_received = paperApprovalReceived;
    voidRequest.paper_approval_date = paperApprovalReceived ? new Date() : null;
    voidRequest.paper_approval_notes = paperApprovalNotes;
    voidRequest.updated_at = new Date();

    // Update the bill status
    const bill = await this.billRepository.findOne({
      where: { id: voidRequest.bill_id },
    });

    if (bill) {
      bill.status = BillStatus.VOIDED;
      bill.updated_at = new Date();
      bill.updated_by = approvedBy;
      await this.billRepository.save(bill);

      // Update all bill items to voided status
      await this.billItemRepository.update(
        { bill_id: voidRequest.bill_id },
        { 
          status: BillItemStatus.VOIDED,
          updated_at: new Date()
        }
      );
    }

    return await this.billVoidRequestRepository.save(voidRequest);
  }

  /**
   * Reject a void request
   */
  async rejectVoidRequest(
    requestId: number,
    rejectedBy: number,
    rejectionNotes?: string
  ): Promise<BillVoidRequest> {
    const voidRequest = await this.billVoidRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!voidRequest) {
      throw new Error("Void request not found");
    }

    if (voidRequest.status !== VoidRequestStatus.PENDING) {
      throw new Error("Void request is not in pending status");
    }

    voidRequest.status = VoidRequestStatus.REJECTED;
    voidRequest.approved_by = rejectedBy;
    voidRequest.approved_at = new Date();
    voidRequest.approval_notes = rejectionNotes;
    voidRequest.updated_at = new Date();

    return await this.billVoidRequestRepository.save(voidRequest);
  }

  /**
   * Get pending void requests for approval
   */
  async getPendingVoidRequests(): Promise<BillVoidRequest[]> {
    return await this.billVoidRequestRepository.find({
      where: { status: VoidRequestStatus.PENDING },
      relations: ["bill", "initiator", "bill.user", "bill.station"],
      order: { created_at: "DESC" },
    });
  }

  /**
   * Get void requests by bill ID
   */
  async getVoidRequestsByBill(billId: number): Promise<BillVoidRequest[]> {
    return await this.billVoidRequestRepository.find({
      where: { bill_id: billId },
      relations: ["initiator", "approver"],
      order: { created_at: "DESC" },
    });
  }

  /**
   * Get void requests initiated by a user
   */
  async getVoidRequestsByInitiator(userId: number): Promise<BillVoidRequest[]> {
    return await this.billVoidRequestRepository.find({
      where: { initiated_by: userId },
      relations: ["bill", "approver", "bill.user", "bill.station"],
      order: { created_at: "DESC" },
    });
  }

  /**
   * Get void request statistics
   */
  async getVoidRequestStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    const [pending, approved, rejected, total] = await Promise.all([
      this.billVoidRequestRepository.count({ where: { status: VoidRequestStatus.PENDING } }),
      this.billVoidRequestRepository.count({ where: { status: VoidRequestStatus.APPROVED } }),
      this.billVoidRequestRepository.count({ where: { status: VoidRequestStatus.REJECTED } }),
      this.billVoidRequestRepository.count(),
    ]);

    return { pending, approved, rejected, total };
  }
}
