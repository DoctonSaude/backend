const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// For Room and Equipment, make partner Partner?
schema = schema.replace(/partner\s+Partner\s+@relation\(fields:\s*\[partnerId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/g, 'partner     Partner?       @relation(fields: [partnerId], references: [id], onDelete: Cascade)');

fs.writeFileSync(schemaPath, schema);
console.log('Fixed optional relations');
