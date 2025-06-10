// Test script to check if we can introspect primary keys from Drizzle schemas
const { getTableConfig } = require('drizzle-orm/pg-core');
const { emailAttachments } = require('./drizzle/schema');

// Get table configuration
const config = getTableConfig(emailAttachments);

console.log('Table name:', config.name);
console.log('Columns:', config.columns.map(c => c.name));
console.log('Primary keys:', config.primaryKeys);

// Check individual columns for primary key info
config.columns.forEach((column) => {
  console.log(`Column ${column.name}: isPrimaryKey = ${column.primary}`);
});