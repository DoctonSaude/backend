const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

const newModels = `
model AiInsight {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  type        String
  title       String
  description String?
  confidence  Int
  impact      String
  category    String
  data        Json?
  actionable  Boolean?  @default(true)
  priority    Int?      @default(3)
  userId      String?   @db.Uuid
  createdAt   DateTime? @default(now()) @db.Timestamptz
  updatedAt   DateTime? @default(now()) @db.Timestamptz
}

model BlogPost {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title           String
  slug            String
  content         String
  excerpt         String?
  category        String?
  author          String?
  image           String?
  published       Boolean?  @default(false)
  isFeatured      Boolean?  @default(false)
  readTime        String?
  views           Int?      @default(0)
  createdAt       DateTime? @default(now()) @db.Timestamptz
  updatedAt       DateTime? @default(now()) @db.Timestamptz
  metaDescription String?
  metaKeywords    String?
  metaTitle       String?
  scheduledAt     DateTime? @db.Timestamptz
}

model VideoContent {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title         String
  description   String?
  videourl      String
  thumbnailurl  String?
  duration      String?
  category      String
  isInteractive Boolean?  @default(false)
  isActive      Boolean?  @default(true)
  order         Int?      @default(0)
  createdAt     DateTime? @default(now()) @db.Timestamptz
  updatedAt     DateTime? @default(now()) @db.Timestamptz
}

model Report {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name      String
  type      String
  format    String
  status    String
  period    String?
  size      String?
  downloads Int?      @default(0)
  createdBy String
  partnerId String?   @db.Uuid
  createdAt DateTime? @default(now()) @db.Timestamptz
}

model AutomatedReport {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name           String
  description    String
  type           String
  frequency      String
  recipients     String[]
  format         String
  isActive       Boolean?  @default(true)
  lastGenerated  DateTime? @db.Timestamptz
  nextGeneration DateTime? @db.Timestamptz
  template       String?
  filters        Json?
  createdAt      DateTime? @default(now()) @db.Timestamptz
}
`;

fs.appendFileSync(schemaPath, newModels, 'utf8');
console.log('Models appended to schema.prisma successfully.');
