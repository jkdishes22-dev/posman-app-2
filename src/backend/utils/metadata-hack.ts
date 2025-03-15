// import { DataSource, EntityTarget } from "typeorm";
// import Container from "typedi";

// const  dataSource = Container.get<DataSource>('DATA_SOURCE');
// export const ensureMetadata = async (entity: EntityTarget<never>) => {
// try {
//   if (!dataSource.hasMetadata(entity)) {
//     console.log(
//       `Metadata for ${entity} not found. Initializing AppDataSource...`,
//     );
//     if (!dataSource.isInitialized) {
//       await dataSource.initialize();
//     }
//   }
// }
//   catch(err) {
//     console.log(
//       `Metadata Error . ${err}`,
//     );
//   }
// };
