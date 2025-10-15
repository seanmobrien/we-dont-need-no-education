// Custom ESLint rule: no-jsdoc-in-ts
// Disallow JSDoc-style /** comments in implementation .ts files (allow in .d.ts)

module.exports = {
  rules: {
    'no-jsdoc-in-ts/no-jsdoc': {
      create(context) {
        const filename = context.getFilename();
        if (filename.endsWith('.d.ts')) return {};
        // Only run on .ts and .tsx files (but not .d.ts)
        if (!/\.tsx?$/.test(filename)) return {};

        return {
          Program(node) {
            const sourceCode = context.getSourceCode();
            const comments = sourceCode.getAllComments();
            for (const comment of comments) {
              if (comment.type === 'Block' && comment.value.startsWith('*')) {
                context.report({
                  node,
                  message:
                    'JSDoc block comments (/** */) are not allowed in implementation .ts/.tsx files. Move rich docs to a .d.ts file.',
                });
                break;
              }
            }
          },
        };
      },
    },
  },
};
