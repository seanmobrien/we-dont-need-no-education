import { isTruthy as fromTypesBarrel } from '../../src/types';
import { isTruthy as direct } from '../../src/types/is-truthy';

describe('types barrel exports', () => {
    it('re-exports isTruthy from src/types', () => {
        expect(fromTypesBarrel).toBe(direct);
    });
});