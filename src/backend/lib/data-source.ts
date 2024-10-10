import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from "@entities/User";

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'password',
    database: 'bizmaster',
    entities: [User],
    synchronize: false,
});

AppDataSource.initialize()
    .then(() => {
        console.log('Data Source has been initialized!');
        console.log('Registered entities:', AppDataSource.entityMetadatas.map(meta => meta.name));
    })
    .catch((err) => {
        console.error('Error during Data Source initialization:', err);
    });
