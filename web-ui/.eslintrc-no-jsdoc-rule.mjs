// Custom ESLint rule: no-jsdoc-in-ts (ESM)
// Disallow JSDoc-style /** comments in implementation .ts files (allow in .d.ts)

export default {
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
    'prefer-function-declarations': {
      create(context) {
        const filename = context.getFilename();
        // Only run on .d.ts files
        if (!filename.endsWith('.d.ts')) return {};

        return {
          // Visit ExportNamedDeclaration anywhere in the file (captures nested exports inside declare modules)
          ExportNamedDeclaration(node) {
            const decl = node.declaration;
            if (!decl || decl.type !== 'VariableDeclaration') return;

            for (const d of decl.declarations) {
              let ta = null;
              if (d.id && d.id.typeAnnotation) {
                ta = d.id.typeAnnotation.typeAnnotation;
              } else if (d.typeAnnotation) {
                ta = d.typeAnnotation.typeAnnotation;
              }

              if (!ta) continue;

              if (ta.type === 'TSParenthesizedType' && ta.typeAnnotation) {
                ta = ta.typeAnnotation;
              }

              if (ta.type === 'TSFunctionType') {
                context.report({
                  node: d,
                  message:
                    'Prefer `export function name(...) : ...;` declarations in .d.ts files instead of `export const name: (...) => ...;`.',
                });
              }
            }
          },
        };
      },
    },
  },
};
