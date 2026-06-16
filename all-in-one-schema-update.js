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

// Rename tenantId fields and add @map("tenantId")
// Match `tenantId String?`
schema = schema.replace(/tenantId(\s+)String\?/g, 'economicGroupId$1String? @map("tenantId")');
// Match `tenantId String`
schema = schema.replace(/tenantId(\s+)String([^?])/g, 'economicGroupId$1String @map("tenantId")$2');

// Fix references inside relations: @relation(fields: [tenantId], references: [id]) -> @relation(fields: [economicGroupId], references: [id])
schema = schema.replace(/fields:\s*\[tenantId\]/g, 'fields: [economicGroupId]');

// Add fields and @@map to EconomicGroup
const newFields = `
  cnpj            String?
  corporateName   String?
  logoUrl         String?
  status          String    @default("ACTIVE")
  @@map("Tenant")
`;
schema = schema.replace(/model EconomicGroup \{[\s\S]*?isActive\s+Boolean\s+@default\(true\)/, (match) => {
  return match + newFields;
});

// ADD NEW MODELS
const unitModel = `
model Unit {
  id              String        @id @default(cuid())
  partnerId       String?
  pharmacyId      String?
  name            String
  code            String?       @unique
  address         String?
  city            String?
  state           String?
  zipCode         String?
  lat             Float?
  lng             Float?
  phone           String?
  whatsapp        String?
  openingHours    String?
  status          String        @default("ACTIVE")
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  Partner         Partner?      @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  Pharmacy        Pharmacy?     @relation(fields: [pharmacyId], references: [id], onDelete: Cascade)
  
  appointments    Appointment[]
  rooms           Room[]
  equipment       Equipment[]
}

model CrmLead {
  id              String        @id @default(cuid())
  economicGroupId String
  partnerId       String?
  unitId          String?
  patientId       String?
  name            String
  email           String?
  phone           String?
  status          String        @default("LEAD")
  source          String?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  EconomicGroup   EconomicGroup @relation(fields: [economicGroupId], references: [id], onDelete: Cascade)
  Partner         Partner?      @relation(fields: [partnerId], references: [id])
  Patient         Patient?      @relation(fields: [patientId], references: [id])
}
`;
schema += '\n' + unitModel;

// Add units and crmLeads arrays to Partner, Pharmacy, EconomicGroup
schema = schema.replace(/model Partner \{([\s\S]*?)\}/, (match, p1) => {
  return `model Partner {${p1}  units           Unit[]\n  crmLeads        CrmLead[]\n}`;
});

schema = schema.replace(/model Pharmacy \{([\s\S]*?)\}/, (match, p1) => {
  return `model Pharmacy {${p1}  units           Unit[]\n}`;
});

schema = schema.replace(/model EconomicGroup \{([\s\S]*?)\}/, (match, p1) => {
  return `model EconomicGroup {${p1}  crmLeads        CrmLead[]\n}`;
});

// Update Appointment, Room, Equipment
schema = schema.replace(/model Appointment \{([\s\S]*?)\}/, (match, p1) => {
  let res = p1.replace(/roomId\s+String\?/, 'roomId          String?\n  unitId          String?');
  res = res + '  Unit            Unit?               @relation(fields: [unitId], references: [id])\n';
  return `model Appointment {${res}}`;
});

schema = schema.replace(/model Room \{([\s\S]*?)\}/, (match, p1) => {
  let res = p1.replace(/partnerId\s+String/, 'partnerId   String?\n  unitId      String?');
  res = res + '  Unit        Unit?       @relation(fields: [unitId], references: [id])\n';
  res = res.replace(/partner\s+Partner\s+@relation\(fields:\s*\[partnerId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/g, 'partner     Partner?       @relation(fields: [partnerId], references: [id], onDelete: Cascade)');
  return `model Room {${res}}`;
});

schema = schema.replace(/model Equipment \{([\s\S]*?)\}/, (match, p1) => {
  let res = p1.replace(/partnerId\s+String/, 'partnerId   String?\n  unitId      String?');
  res = res + '  Unit        Unit?       @relation(fields: [unitId], references: [id])\n';
  res = res.replace(/partner\s+Partner\s+@relation\(fields:\s*\[partnerId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/g, 'partner     Partner?       @relation(fields: [partnerId], references: [id], onDelete: Cascade)');
  return `model Equipment {${res}}`;
});

fs.writeFileSync(schemaPath, schema);
console.log('All-in-one schema update completed successfully');
