import * as indexExports from '../../src/index';
import { forOneOrMany, serviceInstanceOverloadsFactory, unwrapPromise } from '../../src/generics';
import { zodToStructure } from '../../src/zod-to-json-structure';
import {
    isAbortablePromise,
    isKeyOf,
    isMemberOfUnion,
    isNotNull,
    isOperationCancelledError,
    isPromise,
    isValidUuid,
} from '../../src/guards';
import {
    getDecoratorSymbols,
    getUuid,
    isRecordDirty,
    isRecordWithDirtyState,
    isRecordWithUuid,
    newUuid,
    setRecordDirty,
    setUuid,
} from '../../src/record-decorators';
import { AbortablePromise } from '../../src/abortable-promise';

describe('index barrel exports', () => {
    it('re-exports selected guard utilities', () => {
        expect(indexExports.isOperationCancelledError).toBe(isOperationCancelledError);
        expect(indexExports.isAbortablePromise).toBe(isAbortablePromise);
        expect(indexExports.isKeyOf).toBe(isKeyOf);
        expect(indexExports.isMemberOfUnion).toBe(isMemberOfUnion);
        expect(indexExports.isPromise).toBe(isPromise);
        expect(indexExports.isNotNull).toBe(isNotNull);
        expect(indexExports.isValidUuid).toBe(isValidUuid);
    });

    it('re-exports generic utilities', () => {
        expect(indexExports.forOneOrMany).toBe(forOneOrMany);
        expect(indexExports.serviceInstanceOverloadsFactory).toBe(serviceInstanceOverloadsFactory);
        expect(indexExports.unwrapPromise).toBe(unwrapPromise);
    });

    it('re-exports record decorator utilities', () => {
        expect(indexExports.getDecoratorSymbols).toBe(getDecoratorSymbols);
        expect(indexExports.isRecordWithDirtyState).toBe(isRecordWithDirtyState);
        expect(indexExports.isRecordDirty).toBe(isRecordDirty);
        expect(indexExports.setRecordDirty).toBe(setRecordDirty);
        expect(indexExports.isRecordWithUuid).toBe(isRecordWithUuid);
        expect(indexExports.getUuid).toBe(getUuid);
        expect(indexExports.newUuid).toBe(newUuid);
        expect(indexExports.setUuid).toBe(setUuid);
    });

    it('re-exports abortable promise and zod converter', () => {
        expect(indexExports.AbortablePromise).toBe(AbortablePromise);
        expect(indexExports.zodToStructure).toBe(zodToStructure);
    });
});