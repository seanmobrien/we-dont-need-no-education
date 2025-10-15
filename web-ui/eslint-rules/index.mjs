const ruleModule = await import('../.eslintrc-no-jsdoc-rule.mjs');
export default {
  rules: {
    'no-jsdoc': ruleModule.default.rules['no-jsdoc-in-ts/no-jsdoc'],
    'prefer-function-declarations':
      ruleModule.default.rules['prefer-function-declarations'],
  },
};
