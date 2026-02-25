import { deprecate } from '@compliance-theater/types/deprecate';
import { cryptoRandomBytes as baseCryptoRandomBytes } from '@compliance-theater/types/lib/nextjs/crypto-random-bytes';

const cryptoRandomBytes = deprecate(
    baseCryptoRandomBytes,
    'cryptoRandomBytes is deprecated; import directly from types instead of react.',
    'DEP003'
);

export { cryptoRandomBytes };