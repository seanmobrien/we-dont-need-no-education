import * as indexExports from '../../src/index';
import { forOneOrMany, serviceInstanceOverloadsFactory, unwrapPromise } from '../../src/generics';
import { zodToStructure } from '../../src/zod-to-json-structure';
import { isPromise, isNotNull } from '../../src/guards';
import { AbortablePromise } from '../../src/abortable-promise';

describe('index barrel exports', () => {
    it('re-exports selected guard utilities', () => {
        expect(indexExports.isPromise).toBe(isPromise);
        expect(indexExports.isNotNull).toBe(isNotNull);
    });

    it('re-exports generic utilities', () => {
        expect(indexExports.forOneOrMany).toBe(forOneOrMany);
        expect(indexExports.serviceInstanceOverloadsFactory).toBe(serviceInstanceOverloadsFactory);
        expect(indexExports.unwrapPromise).toBe(unwrapPromise);
    });

    it('re-exports abortable promise and zod converter', () => {
        expect(indexExports.AbortablePromise).toBe(AbortablePromise);
        expect(indexExports.zodToStructure).toBe(zodToStructure);
    });
});