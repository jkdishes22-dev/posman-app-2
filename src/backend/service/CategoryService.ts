import { AppDataSource } from "@backend/config/data-source";
import { Category, CategoryStatus } from "@backend/entities/Category";

export class CategoryService {
    private categoryRepository = AppDataSource.getRepository(Category);

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