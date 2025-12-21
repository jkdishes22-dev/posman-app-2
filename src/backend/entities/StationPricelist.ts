import { Column, Entity, JoinColumn, ManyToOne, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity";
import { Station } from "./Station";
import { Pricelist } from "./Pricelist";

export enum StationPricelistStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    UNDER_REVIEW = "under_review",
}

@Entity("station_pricelist")
@Index(["station", "pricelist"], { unique: true })
@Index(["station", "is_default"])
@Index(["pricelist", "status"])
export class StationPricelist extends BaseEntity {
    @ManyToOne(() => Station, { eager: true })
    @JoinColumn({ name: "station_id" })
    station: Station;

    @ManyToOne(() => Pricelist, { eager: true })
    @JoinColumn({ name: "pricelist_id" })
    pricelist: Pricelist


    @Column({ type: "boolean", default: false })
    is_default: boolean;

    @Column({
        type: "enum",
        enum: StationPricelistStatus,
        default: StationPricelistStatus.ACTIVE,
    })
    status: StationPricelistStatus;

    @Column({ type: "varchar", length: 255, nullable: true })
    notes: string; // Optional notes about why this pricelist is linked to this station
}
