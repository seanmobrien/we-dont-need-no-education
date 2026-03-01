import * as rootExports from '../src';
import * as clientExports from '../src/client';
import * as errorsExports from '../src/errors';
import * as errorsIndexExports from '../src/errors/index';
import * as hooksExports from '../src/hooks';

import { ClientWrapper } from '../src/ClientWrapper';
import { isErrorLike } from '../src/errors/error-like';
import { ValidationError } from '../src/errors/validation-error';
import { useInEffect } from '../src/hooks/useInEffect';
import { generateUniqueId } from '../src/utility-methods';

describe('attached barrel exports', () => {
    it('client.ts re-exports utility/errors/hooks symbols', () => {
        expect(clientExports.generateUniqueId).toBe(generateUniqueId);
        expect(clientExports.isErrorLike).toBe(isErrorLike);
        expect(clientExports.useInEffect).toBe(useInEffect);
    });

    it('errors.ts mirrors errors/index.ts exports', () => {
        expect(errorsExports.ValidationError).toBe(errorsIndexExports.ValidationError);
        expect(errorsExports.isErrorLike).toBe(errorsIndexExports.isErrorLike);
    });

    it('root index re-exports core symbols including ClientWrapper', () => {
        expect(rootExports.ClientWrapper).toBe(ClientWrapper);
        expect(rootExports.ValidationError).toBe(ValidationError);
        expect(rootExports.useInEffect).toBe(hooksExports.useInEffect);
        expect(rootExports.generateUniqueId).toBe(generateUniqueId);
    });
});
