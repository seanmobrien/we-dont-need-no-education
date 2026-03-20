import * as rootExports from '../src';
import * as clientExports from '../src/client';
import * as hooksExports from '../src/hooks';

import { ClientWrapper } from '../src/ClientWrapper';
import { useInEffect } from '../src/hooks/useInEffect';
import { generateUniqueId } from '../src/utility-methods';

describe('attached barrel exports', () => {
    it('client.ts re-exports utility and hook symbols', () => {
        expect(clientExports.generateUniqueId).toBe(generateUniqueId);
        expect(clientExports.useInEffect).toBe(useInEffect);
    });

    it('root index re-exports core symbols including ClientWrapper', () => {
        expect(rootExports.ClientWrapper).toBe(ClientWrapper);
        expect(rootExports.useInEffect).toBe(hooksExports.useInEffect);
        expect(rootExports.generateUniqueId).toBe(generateUniqueId);
    });
});
