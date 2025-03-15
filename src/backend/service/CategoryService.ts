import { Category, CategoryStatus } from "@backend/entities/Category";
import Container from "typedi";
import { Repository, DataSource } from "typeorm";

export class CategoryService {
     private categoryRepository: Repository<Category>;

      private dataSource = Container.get<DataSource>('DATA_SOURCE');
     
         constructor() {
            this.categoryRepository = this.dataSource.getRepository(Category);
        }

    public async createCategory(name: string): Promise<Category> {
        const category: Category = this.categoryRepository.create({
            name,
            status: CategoryStatus.ACTIVE,
        });
        return this.categoryRepository.save(category);
    }

    public async fetchCategories(): Promise<Category[]> {
        return this.categoryRepository.find();
    }

    async deleteCategory(id: number): Promise<void> {
        await this.categoryRepository.update(id, {
            status: CategoryStatus.DELETED,
        });
    }
}