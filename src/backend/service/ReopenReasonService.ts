import { Service } from "typedi";
import { DataSource, Repository } from "typeorm";
import { ReopenReason } from "@backend/entities/ReopenReason";
import { cache } from "@backend/utils/cache";

const REOPEN_REASONS_CACHE_KEY = "reopen_reasons_active";
const REOPEN_REASONS_TTL_MS = 30 * 60 * 1000; // perf: 30 min — reasons rarely change

@Service()
export class ReopenReasonService {
    private reopenReasonRepository: Repository<ReopenReason>;

    constructor(private dataSource: DataSource) {
        this.reopenReasonRepository = this.dataSource.getRepository(ReopenReason);
    }

    async getAllActiveReasons(): Promise<ReopenReason[]> {
        const cached = cache.get<ReopenReason[]>(REOPEN_REASONS_CACHE_KEY);
        if (cached !== null) return cached;

        const reasons = await this.reopenReasonRepository.find({
            where: { is_active: true },
            order: { sort_order: "ASC", name: "ASC" }
        });
        cache.set(REOPEN_REASONS_CACHE_KEY, reasons, REOPEN_REASONS_TTL_MS);
        return reasons;
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
        const saved = await this.reopenReasonRepository.save(reason);
        cache.delete(REOPEN_REASONS_CACHE_KEY);
        return saved;
    }

    async updateReason(id: number, reasonData: Partial<ReopenReason>): Promise<ReopenReason | null> {
        await this.reopenReasonRepository.update(id, reasonData);
        cache.delete(REOPEN_REASONS_CACHE_KEY);
        return await this.reopenReasonRepository.findOne({ where: { id } });
    }

    async deleteReason(id: number): Promise<boolean> {
        const result = await this.reopenReasonRepository.delete(id);
        cache.delete(REOPEN_REASONS_CACHE_KEY);
        return result.affected !== 0;
    }

    async toggleReasonStatus(id: number): Promise<ReopenReason | null> {
        const reason = await this.reopenReasonRepository.findOne({ where: { id } });
        if (!reason) return null;

        reason.is_active = !reason.is_active;
        const saved = await this.reopenReasonRepository.save(reason);
        cache.delete(REOPEN_REASONS_CACHE_KEY);
        return saved;
    }
}
