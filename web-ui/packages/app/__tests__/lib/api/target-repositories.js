import { BaseDrizzleRepository } from '@/lib/api/_baseDrizzleRepository';
export class TestDrizzleRepository extends BaseDrizzleRepository {
    constructor(config) {
        super(config);
    }
    prepareInsertData(model) {
        return {
            name: model.name,
            description: model.description,
        };
    }
    prepareUpdateData(model) {
        const updateData = {};
        if (model.name !== undefined)
            updateData.name = model.name;
        if (model.description !== undefined)
            updateData.description = model.description;
        return updateData;
    }
}
export class FilteredTestDrizzleRepository extends BaseDrizzleRepository {
    nameFilter;
    constructor(config, nameFilter) {
        super(config);
        this.nameFilter = nameFilter;
    }
    buildQueryConditions() {
        if (this.nameFilter) {
            return { mockFilter: this.nameFilter };
        }
        return undefined;
    }
    prepareInsertData(model) {
        return {
            name: model.name,
            description: model.description,
        };
    }
    prepareUpdateData(model) {
        const updateData = {};
        if (model.name !== undefined)
            updateData.name = model.name;
        if (model.description !== undefined)
            updateData.description = model.description;
        return updateData;
    }
}
//# sourceMappingURL=target-repositories.js.map