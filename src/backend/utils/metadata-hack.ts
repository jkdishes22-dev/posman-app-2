import { EntityTarget } from "typeorm";
import { AppDataSource } from "../config/data-source";

export const ensureMetadata = async (entity: EntityTarget<any>) => {
  if (!AppDataSource.hasMetadata(entity)) {
    console.log(
      `Metadata for ${entity} not found. Initializing AppDataSource...`,
    );
    await AppDataSource.initialize();
  }
};
