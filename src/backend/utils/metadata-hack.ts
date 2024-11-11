import { EntityTarget } from "typeorm";
import { AppDataSource } from "../config/data-source";

export const ensureMetadata = async (entity: EntityTarget<never>) => {
  if (!AppDataSource.hasMetadata(entity)) {
    console.log(
      `Metadata for ${entity} not found. Initializing AppDataSource...`,
    );
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  }
};
