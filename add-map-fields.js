const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Map economicGroupId to tenantId
schema = schema.replace(/economicGroupId\s+String\?/g, 'economicGroupId String? @map("tenantId")');
schema = schema.replace(/economicGroupId\s+String\b/g, 'economicGroupId String @map("tenantId")');

fs.writeFileSync(schemaPath, schema);
console.log('Added field mapping to EconomicGroup');
