import { Service } from "typedi";
import { DataSource, Repository } from "typeorm";
import { ReopenReason } from "@backend/entities/ReopenReason";

@Service()
export class ReopenReasonService {
    private reopenReasonRepository: Repository<ReopenReason>;

    constructor(private dataSource: DataSource) {
        this.reopenReasonRepository = this.dataSource.getRepository(ReopenReason);
    }

    async getAllActiveReasons(): Promise<ReopenReason[]> {
        return await this.reopenReasonRepository.find({
            where: { is_active: true },
            order: { sort_order: "ASC", name: "ASC" }
        });
    }

    async getReasonByKey(reasonKey: string): Promise<ReopenReason | null> {
        return await this.reopenReasonRepository.findOne({
            where: { reason_key: reasonKey, is_active: true }
        });
    }

    async getAllReasons(): Promise<ReopenReason[]> {
        return await this.reopenReasonRepository.find({
            order: { sort_order: "ASC", name: "ASC" }
        });
    }

    async createReason(reasonData: Partial<ReopenReason>): Promise<ReopenReason> {
        const reason = this.reopenReasonRepository.create(reasonData);
        return await this.reopenReasonRepository.save(reason);
    }

    async updateReason(id: number, reasonData: Partial<ReopenReason>): Promise<ReopenReason | null> {
        await this.reopenReasonRepository.update(id, reasonData);
        return await this.reopenReasonRepository.findOne({ where: { id } });
    }

    async deleteReason(id: number): Promise<boolean> {
        const result = await this.reopenReasonRepository.delete(id);
        return result.affected !== 0;
    }

    async toggleReasonStatus(id: number): Promise<ReopenReason | null> {
        const reason = await this.reopenReasonRepository.findOne({ where: { id } });
        if (!reason) return null;

        reason.is_active = !reason.is_active;
        return await this.reopenReasonRepository.save(reason);
    }
}
