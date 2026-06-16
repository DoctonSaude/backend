const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Rename Tenant model
schema = schema.replace(/model Tenant \{/g, 'model EconomicGroup {');

// Rename relation fields pointing to Tenant
schema = schema.replace(/Tenant\s+Tenant\?/g, 'EconomicGroup EconomicGroup?');
schema = schema.replace(/tenant\s+Tenant\?/g, 'economicGroup EconomicGroup?');
schema = schema.replace(/Tenant\s+Tenant/g, 'EconomicGroup EconomicGroup');
schema = schema.replace(/tenant\s+Tenant/g, 'economicGroup EconomicGroup');

// Rename tenantId fields
schema = schema.replace(/tenantId\s+String\?/g, 'economicGroupId String?');
schema = schema.replace(/tenantId\s+String/g, 'economicGroupId String');

// Fix references inside relations: @relation(fields: [tenantId], references: [id]) -> @relation(fields: [economicGroupId], references: [id])
schema = schema.replace(/fields:\s*\[tenantId\]/g, 'fields: [economicGroupId]');

// Add fields to EconomicGroup
const newFields = `
  cnpj            String?
  corporateName   String?
  logoUrl         String?
  status          String    @default("ACTIVE")
`;
schema = schema.replace(/model EconomicGroup \{[\s\S]*?isActive\s+Boolean\s+@default\(true\)/, (match) => {
  return match + newFields;
});

// Write back
fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully');
