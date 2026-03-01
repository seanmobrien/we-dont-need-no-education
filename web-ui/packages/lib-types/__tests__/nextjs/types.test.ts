describe('nextjs types barrel module', () => {
    it('is importable at runtime', async () => {
        await expect(import('../../src/lib/nextjs/types')).resolves.toBeDefined();
    });
});