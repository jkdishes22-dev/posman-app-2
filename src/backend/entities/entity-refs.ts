// Lazy entity class registry used to break circular import TDZ in webpack bundles.
// Entities that reference each other circularly use EntityRef.get() in their
// decorator lambdas instead of a direct import, preventing webpack from creating
// async modules (which place class declarations after an await, causing TDZ).
// Registration happens in data-source.factory.ts after all entity modules load.
type EntityClass = new (...args: any[]) => any;

const _registry = new Map<string, EntityClass>();

export const EntityRef = {
  set(name: string, cls: EntityClass): void {
    _registry.set(name, cls);
  },
  get(name: string): EntityClass {
    const cls = _registry.get(name);
    if (!cls) {
      throw new Error(
        `EntityRef: "${name}" not registered. Ensure data-source.factory.ts is loaded before AppDataSource.initialize().`,
      );
    }
    return cls;
  },
};
