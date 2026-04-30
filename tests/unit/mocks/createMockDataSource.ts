import { vi } from "vitest";

export function createMockQueryBuilder() {
  const qb: any = {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orWhere: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    innerJoinAndSelect: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    distinct: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    addGroupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue([]),
    getOne: vi.fn().mockResolvedValue(null),
    getRawMany: vi.fn().mockResolvedValue([]),
    getRawOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue({ affected: 0 }),
    getCount: vi.fn().mockResolvedValue(0),
    getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
  };
  return qb;
}

export function createMockTransactionalEntityManager() {
  const qb = createMockQueryBuilder();
  return {
    save: vi.fn().mockImplementation(async (_entityClass: any, data?: any) => {
      // Support both save(Entity, data) and save(data) calling conventions
      return data ?? _entityClass ?? {};
    }),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    findOneBy: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((_entityClass: any, data?: any) => data ?? {}),
    getRepository: vi.fn().mockImplementation(() => createMockRepository()),
    createQueryBuilder: vi.fn().mockReturnValue(qb),
    connection: {
      transaction: vi.fn().mockImplementation(async (cb: any) =>
        cb(createMockTransactionalEntityManager())
      ),
    },
  };
}

export function createMockRepository<T = any>() {
  const qb = createMockQueryBuilder();
  const repo: any = {
    create: vi.fn().mockImplementation((data: any) => ({ ...data })),
    save: vi.fn().mockResolvedValue({}),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    findOneBy: vi.fn().mockResolvedValue(null),
    insert: vi.fn().mockResolvedValue({ identifiers: [{ id: 1 }], generatedMaps: [] }),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    count: vi.fn().mockResolvedValue(0),
    createQueryBuilder: vi.fn().mockReturnValue(qb),
    manager: {
      transaction: vi.fn().mockImplementation(async (cb: any) =>
        cb(createMockTransactionalEntityManager())
      ),
      getRepository: vi.fn().mockImplementation(() => createMockRepository()),
      createQueryBuilder: vi.fn().mockReturnValue(qb),
      query: vi.fn().mockResolvedValue([]),
      connection: {
        transaction: vi.fn().mockImplementation(async (cb: any) =>
          cb(createMockTransactionalEntityManager())
        ),
      },
    },
  };
  return repo as any;
}

export function createMockDataSource(
  repositoryMap: Record<string, ReturnType<typeof createMockRepository>> = {}
) {
  const qb = createMockQueryBuilder();
  const defaultRepo = createMockRepository();

  const ds: any = {
    getRepository: vi.fn().mockImplementation((entity: any) => {
      const name = typeof entity === "string" ? entity : entity?.name;
      return repositoryMap[name] ?? defaultRepo;
    }),
    manager: {
      transaction: vi.fn().mockImplementation(async (cb: any) =>
        cb(createMockTransactionalEntityManager())
      ),
      getRepository: vi.fn().mockImplementation((entity: any) => {
        const name = typeof entity === "string" ? entity : entity?.name;
        return repositoryMap[name] ?? defaultRepo;
      }),
      createQueryBuilder: vi.fn().mockReturnValue(qb),
      connection: {
        transaction: vi.fn().mockImplementation(async (cb: any) =>
          cb(createMockTransactionalEntityManager())
        ),
      },
    },
    query: vi.fn().mockResolvedValue([]),
    createQueryBuilder: vi.fn().mockReturnValue(qb),
    transaction: vi.fn().mockImplementation(async (cb: any) =>
      cb(createMockTransactionalEntityManager())
    ),
  };
  return ds;
}

export function createMockAppDataSource() {
  const qb = createMockQueryBuilder();
  return {
    getRepository: vi.fn().mockImplementation(() => createMockRepository()),
    query: vi.fn().mockResolvedValue([]),
    createQueryBuilder: vi.fn().mockReturnValue(qb),
    transaction: vi.fn().mockImplementation(async (cb: any) =>
      cb(createMockTransactionalEntityManager())
    ),
  };
}
