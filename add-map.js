const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Add @@map("Tenant") to EconomicGroup
schema = schema.replace(/model EconomicGroup \{([\s\S]*?status\s+String\s+@default\("ACTIVE"\))/g, 'model EconomicGroup {\n$1\n\n  @@map("Tenant")');

fs.writeFileSync(schemaPath, schema);
console.log('Added @@map to EconomicGroup');
