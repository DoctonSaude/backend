const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

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
  status          String        @default("LEAD") // LEAD, INTERESTED, EVALUATION, EXAMS, TREATMENT, RETENTION
  source          String?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  EconomicGroup   EconomicGroup @relation(fields: [economicGroupId], references: [id], onDelete: Cascade)
  Partner         Partner?      @relation(fields: [partnerId], references: [id])
  Patient         Patient?      @relation(fields: [patientId], references: [id])
}
`;

// Append models to the end
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

// For Appointment, Room, Equipment: change partnerId to unitId or add unitId
// Appointment
schema = schema.replace(/model Appointment \{([\s\S]*?)\}/, (match, p1) => {
  let res = p1.replace(/roomId\s+String\?/, 'roomId          String?\n  unitId          String?');
  res = res + '  Unit            Unit?               @relation(fields: [unitId], references: [id])\n';
  return `model Appointment {${res}}`;
});

// Room
schema = schema.replace(/model Room \{([\s\S]*?)\}/, (match, p1) => {
  let res = p1.replace(/partnerId\s+String/, 'partnerId   String?\n  unitId      String?');
  res = res + '  Unit        Unit?       @relation(fields: [unitId], references: [id])\n';
  return `model Room {${res}}`;
});

// Equipment
schema = schema.replace(/model Equipment \{([\s\S]*?)\}/, (match, p1) => {
  let res = p1.replace(/partnerId\s+String/, 'partnerId   String?\n  unitId      String?');
  res = res + '  Unit        Unit?       @relation(fields: [unitId], references: [id])\n';
  return `model Equipment {${res}}`;
});

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated with Unit and CrmLead');
