/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = {
  rules: {
    'no-jsdoc': require('../.eslintrc-no-jsdoc-rule').rules[
      'no-jsdoc-in-ts/no-jsdoc'
    ],
  },
};
