import { BaseDrizzleRepository } from '@/lib/api/_baseDrizzleRepository';
import { DrizzleRepositoryConfig } from '@/lib/api/_types';
import { SQL } from 'drizzle-orm';

// Test model interface

export interface TestModel {
  id: number;
  name: string;
  description: string | null;
}
// Concrete implementation for testing
export class TestDrizzleRepository extends BaseDrizzleRepository<
  TestModel,
  'id'
> {
  constructor(config: DrizzleRepositoryConfig<TestModel, 'id'>) {
    super(config);
  }

  protected prepareInsertData(
    model: Omit<TestModel, 'id'>,
  ): Record<string, unknown> {
    return {
      name: model.name,
      description: model.description,
    };
  }

  protected prepareUpdateData(
    model: Partial<TestModel>,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};
    if (model.name !== undefined) updateData.name = model.name;
    if (model.description !== undefined)
      updateData.description = model.description;
    return updateData;
  }
}

// Test repository with custom filtering for testing the new buildQueryConditions approach
export class FilteredTestDrizzleRepository extends BaseDrizzleRepository<
  TestModel,
  'id'
> {
  constructor(
    config: DrizzleRepositoryConfig<TestModel, 'id'>,
    private nameFilter?: string,
  ) {
    super(config);
  }

  protected buildQueryConditions() {
    if (this.nameFilter) {
      // This would normally use eq(table.name, this.nameFilter) but we'll mock it
      return { mockFilter: this.nameFilter } as unknown as SQL;
    }
    return undefined;
  }

  protected prepareInsertData(
    model: Omit<TestModel, 'id'>,
  ): Record<string, unknown> {
    return {
      name: model.name,
      description: model.description,
    };
  }

  protected prepareUpdateData(
    model: Partial<TestModel>,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};
    if (model.name !== undefined) updateData.name = model.name;
    if (model.description !== undefined)
      updateData.description = model.description;
    return updateData;
  }
}
