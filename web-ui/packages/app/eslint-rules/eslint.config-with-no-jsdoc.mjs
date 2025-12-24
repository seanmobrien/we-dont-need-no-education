import base from '../eslint.config.mjs';
import ruleConfig from './.eslintrc-no-jsdoc-rule.mjs';

// Compose base config and add our custom rule as a plugin
const config = [
  ...base,
  {
    // register our local plugin rules under the name 'no-jsdoc-in-ts'
    plugins: {
      'no-jsdoc-in-ts': {
        rules: {
          // map the inner rule implementation (the .mjs exports a config object with rules)
          'no-jsdoc': ruleConfig.rules['no-jsdoc-in-ts/no-jsdoc'],
          'prefer-function-declarations':
            ruleConfig.rules['prefer-function-declarations'],
        },
      },
    },
    rules: {
      // enable the rule as an error
      'no-jsdoc-in-ts/no-jsdoc': 'error',
      // also enable the prefer-function-declarations rule on .d.ts files
      'no-jsdoc-in-ts/prefer-function-declarations': 'warn',
    },
  },
];

export default config;
