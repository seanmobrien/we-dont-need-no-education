const { classifyError, ErrorType } = require('./lib/error-monitoring/recovery-strategies.ts');

const serverErrors = [
  new Error('Internal server error'),
  new Error('HTTP 500 error'),
  new Error('502 Bad Gateway'),
  new Error('503 Service Unavailable'),
  new Error('504 Gateway Timeout'),
];

serverErrors.forEach(error => {
  console.log(`Error: '${error.message}' -> ${classifyError(error)}`);
});

console.log('\nExpected: server');