
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  name: 'name',
  role: 'role',
  emailVerified: 'emailVerified',
  phone: 'phone',
  avatar: 'avatar',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  department: 'department',
  jobTitle: 'jobTitle'
};

exports.Prisma.ChatHistoryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  message: 'message',
  response: 'response',
  context: 'context',
  createdAt: 'createdAt'
};

exports.Prisma.AdminScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  permissions: 'permissions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  roleId: 'roleId'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  permissions: 'permissions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AppointmentScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  partnerId: 'partnerId',
  dateTime: 'dateTime',
  duration: 'duration',
  status: 'status',
  isOnline: 'isOnline',
  meetingLink: 'meetingLink',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  description: 'description',
  amount: 'amount',
  type: 'type',
  category: 'category',
  status: 'status',
  date: 'date',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  metadata: 'metadata',
  client: 'client',
  dreCategory: 'dreCategory',
  dueDate: 'dueDate',
  partnerId: 'partnerId',
  paymentDate: 'paymentDate',
  patientId: 'patientId'
};

exports.Prisma.TransferScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  partnerName: 'partnerName',
  partnerEmail: 'partnerEmail',
  amount: 'amount',
  status: 'status',
  type: 'type',
  receiptUrl: 'receiptUrl',
  scheduledFor: 'scheduledFor',
  processedAt: 'processedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PartnerFinancialDataScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  bankCode: 'bankCode',
  bankName: 'bankName',
  agency: 'agency',
  accountNumber: 'accountNumber',
  accountType: 'accountType',
  accountHolder: 'accountHolder',
  taxId: 'taxId',
  taxIdType: 'taxIdType',
  stateRegistration: 'stateRegistration',
  billingAddress: 'billingAddress',
  billingCity: 'billingCity',
  billingState: 'billingState',
  billingZipCode: 'billingZipCode',
  platformFeePercentage: 'platformFeePercentage',
  paymentFrequency: 'paymentFrequency',
  paymentMethod: 'paymentMethod',
  pixKey: 'pixKey',
  pixKeyType: 'pixKeyType',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PartnerServiceScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  name: 'name',
  description: 'description',
  duration: 'duration',
  price: 'price',
  isOnline: 'isOnline',
  isPresencial: 'isPresencial',
  isActive: 'isActive',
  category: 'category',
  appointments: 'appointments',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  basePrice: 'basePrice',
  discountBasic: 'discountBasic',
  discountEnterprise: 'discountEnterprise',
  discountPremium: 'discountPremium',
  doctonFeePercent: 'doctonFeePercent',
  partnerPayout: 'partnerPayout',
  serviceCategoryId: 'serviceCategoryId'
};

exports.Prisma.ServiceCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  defaultMarkup: 'defaultMarkup',
  parentId: 'parentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ChallengeScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  type: 'type',
  points: 'points',
  icon: 'icon',
  targetValue: 'targetValue',
  frequency: 'frequency',
  category: 'category',
  difficulty: 'difficulty',
  estimatedTime: 'estimatedTime',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  approvalStatus: 'approvalStatus',
  createdBy: 'createdBy',
  endDate: 'endDate',
  sponsor: 'sponsor',
  startDate: 'startDate',
  status: 'status',
  imageUrl: 'imageUrl'
};

exports.Prisma.PatientBadgeScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  badgeId: 'badgeId',
  unlockedAt: 'unlockedAt'
};

exports.Prisma.PatientRewardScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  rewardId: 'rewardId',
  redeemedAt: 'redeemedAt',
  usedAt: 'usedAt',
  isUsed: 'isUsed',
  code: 'code',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HealthLogScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  type: 'type',
  value: 'value',
  unit: 'unit',
  notes: 'notes',
  logDate: 'logDate',
  createdAt: 'createdAt'
};

exports.Prisma.BadgeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  rarity: 'rarity',
  category: 'category',
  criteria: 'criteria',
  isSecret: 'isSecret',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  appointmentId: 'appointmentId',
  partnerId: 'partnerId',
  rating: 'rating',
  comment: 'comment',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  reply: 'reply',
  replyDate: 'replyDate'
};

exports.Prisma.RewardScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  pointsCost: 'pointsCost',
  category: 'category',
  isActive: 'isActive',
  stockQuantity: 'stockQuantity',
  discountPercent: 'discountPercent',
  partnerInfo: 'partnerInfo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  imageUrl: 'imageUrl',
  status: 'status'
};

exports.Prisma.LoyaltyTierScalarFieldEnum = {
  id: 'id',
  name: 'name',
  minPoints: 'minPoints',
  color: 'color',
  benefits: 'benefits',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  endDate: 'endDate',
  startDate: 'startDate',
  type: 'type'
};

exports.Prisma.LoyaltyCampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  multiplier: 'multiplier',
  startDate: 'startDate',
  endDate: 'endDate',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LoyaltyConfigScalarFieldEnum = {
  id: 'id',
  pointsPerReal: 'pointsPerReal',
  onboardingPoints: 'onboardingPoints',
  reviewPoints: 'reviewPoints',
  updatedAt: 'updatedAt'
};

exports.Prisma.MedicalRecordScalarFieldEnum = {
  id: 'id',
  appointmentId: 'appointmentId',
  patientId: 'patientId',
  partnerId: 'partnerId',
  diagnosis: 'diagnosis',
  symptoms: 'symptoms',
  treatment: 'treatment',
  observations: 'observations',
  attachments: 'attachments',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PrescriptionScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  partnerId: 'partnerId',
  medication: 'medication',
  dosage: 'dosage',
  frequency: 'frequency',
  duration: 'duration',
  medications: 'medications',
  instructions: 'instructions',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate',
  sideEffects: 'sideEffects',
  contraindications: 'contraindications',
  category: 'category',
  validUntil: 'validUntil',
  doctor: 'doctor',
  date: 'date',
  attachments: 'attachments',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MedicationReminderScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  prescriptionId: 'prescriptionId',
  medicationName: 'medicationName',
  dosage: 'dosage',
  times: 'times',
  startDate: 'startDate',
  endDate: 'endDate',
  isActive: 'isActive',
  notes: 'notes',
  lastTaken: 'lastTaken',
  nextDue: 'nextDue',
  adherenceRate: 'adherenceRate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MedicalHistoryScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  date: 'date',
  type: 'type',
  doctor: 'doctor',
  specialty: 'specialty',
  description: 'description',
  diagnosis: 'diagnosis',
  treatment: 'treatment',
  location: 'location',
  status: 'status',
  notes: 'notes',
  attachments: 'attachments',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnamnesisScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  date: 'date',
  chiefComplaint: 'chiefComplaint',
  currentIllness: 'currentIllness',
  familyHistory: 'familyHistory',
  personalHistory: 'personalHistory',
  medications: 'medications',
  allergies: 'allergies',
  socialHistory: 'socialHistory',
  reviewOfSystems: 'reviewOfSystems',
  vitalSigns: 'vitalSigns',
  physicalExam: 'physicalExam',
  assessment: 'assessment',
  plan: 'plan',
  doctorName: 'doctorName',
  specialty: 'specialty',
  attachments: 'attachments',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HealthExamScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  date: 'date',
  type: 'type',
  name: 'name',
  doctor: 'doctor',
  laboratory: 'laboratory',
  status: 'status',
  results: 'results',
  referenceValues: 'referenceValues',
  interpretation: 'interpretation',
  attachments: 'attachments',
  urgency: 'urgency',
  fasting: 'fasting',
  preparation: 'preparation',
  cost: 'cost',
  healthPlan: 'healthPlan',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PartnerScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  phone: 'phone',
  specialty: 'specialty',
  crm: 'crm',
  cnpj: 'cnpj',
  description: 'description',
  address: 'address',
  city: 'city',
  state: 'state',
  zipCode: 'zipCode',
  consultationPrice: 'consultationPrice',
  acceptsOnline: 'acceptsOnline',
  isApproved: 'isApproved',
  rating: 'rating',
  totalReviews: 'totalReviews',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  rejectionReason: 'rejectionReason',
  specialties: 'specialties',
  type: 'type',
  acceptsEmergency: 'acceptsEmergency',
  acceptsInsurance: 'acceptsInsurance',
  acceptsTelemedicine: 'acceptsTelemedicine',
  education: 'education',
  experienceYears: 'experienceYears',
  facilities: 'facilities',
  foundationYear: 'foundationYear',
  insurances: 'insurances',
  languages: 'languages',
  workingHours: 'workingHours',
  settings: 'settings'
};

exports.Prisma.TeamMemberScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  name: 'name',
  specialty: 'specialty',
  crm: 'crm',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  avatar: 'avatar',
  email: 'email',
  phone: 'phone'
};

exports.Prisma.PartnerDocumentScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  type: 'type',
  name: 'name',
  url: 'url',
  status: 'status',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatientScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  cpf: 'cpf',
  birthDate: 'birthDate',
  gender: 'gender',
  address: 'address',
  city: 'city',
  state: 'state',
  zipCode: 'zipCode',
  bloodType: 'bloodType',
  allergies: 'allergies',
  chronicDiseases: 'chronicDiseases',
  currentMedications: 'currentMedications',
  emergencyContact: 'emergencyContact',
  emergencyPhone: 'emergencyPhone',
  healthPoints: 'healthPoints',
  experiencePoints: 'experiencePoints',
  level: 'level',
  levelTitle: 'levelTitle',
  levelTier: 'levelTier',
  currentStreak: 'currentStreak',
  longestStreak: 'longestStreak',
  lastActiveDate: 'lastActiveDate',
  totalChallengesCompleted: 'totalChallengesCompleted',
  totalBadgesEarned: 'totalBadgesEarned',
  referralCode: 'referralCode',
  referredBy: 'referredBy',
  referralEarnings: 'referralEarnings',
  referralCount: 'referralCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  archetype: 'archetype',
  healthGoals: 'healthGoals',
  lifestyle: 'lifestyle',
  onboardingCompleted: 'onboardingCompleted',
  settings: 'settings'
};

exports.Prisma.PatientGoalScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  title: 'title',
  description: 'description',
  target: 'target',
  current: 'current',
  type: 'type',
  deadline: 'deadline',
  reward: 'reward',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FavoritePartnerScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  partnerId: 'partnerId',
  createdAt: 'createdAt'
};

exports.Prisma.PatientChallengeScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  challengeId: 'challengeId',
  status: 'status',
  progress: 'progress',
  startDate: 'startDate',
  completedAt: 'completedAt',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AchievementShareScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  achievementTitle: 'achievementTitle',
  achievementType: 'achievementType',
  platform: 'platform',
  imageUrl: 'imageUrl',
  createdAt: 'createdAt'
};

exports.Prisma.PointsHistoryScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  points: 'points',
  action: 'action',
  description: 'description',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.XPTransactionScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  actionId: 'actionId',
  actionName: 'actionName',
  baseXP: 'baseXP',
  finalXP: 'finalXP',
  multipliers: 'multipliers',
  context: 'context',
  createdAt: 'createdAt'
};

exports.Prisma.ReportScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  format: 'format',
  status: 'status',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  period: 'period',
  size: 'size',
  downloads: 'downloads',
  partnerId: 'partnerId'
};

exports.Prisma.AutomatedReportScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  type: 'type',
  frequency: 'frequency',
  recipients: 'recipients',
  format: 'format',
  isActive: 'isActive',
  lastGenerated: 'lastGenerated',
  nextGeneration: 'nextGeneration',
  template: 'template',
  filters: 'filters',
  createdAt: 'createdAt'
};

exports.Prisma.AnalyticsEventScalarFieldEnum = {
  id: 'id',
  event: 'event',
  properties: 'properties',
  userId: 'userId',
  timestamp: 'timestamp',
  sessionId: 'sessionId',
  page: 'page',
  createdAt: 'createdAt'
};

exports.Prisma.AbTestConversionScalarFieldEnum = {
  id: 'id',
  testName: 'testName',
  variant: 'variant',
  conversionType: 'conversionType',
  timestamp: 'timestamp',
  createdAt: 'createdAt'
};

exports.Prisma.AnalyticsAlertScalarFieldEnum = {
  id: 'id',
  metric: 'metric',
  threshold: 'threshold',
  condition: 'condition',
  active: 'active',
  createdAt: 'createdAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  planId: 'planId',
  status: 'status',
  paymentMethod: 'paymentMethod',
  startedAt: 'startedAt',
  cancelledAt: 'cancelledAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupportTicketScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  subject: 'subject',
  status: 'status',
  priority: 'priority',
  rating: 'rating',
  ratingComment: 'ratingComment',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  category: 'category',
  userEmail: 'userEmail',
  userName: 'userName',
  assignedToId: 'assignedToId',
  partnerId: 'partnerId'
};

exports.Prisma.SupportMessageScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  sender: 'sender',
  message: 'message',
  createdAt: 'createdAt'
};

exports.Prisma.PlanScalarFieldEnum = {
  id: 'id',
  key: 'key',
  name: 'name',
  price: 'price',
  interval: 'interval',
  features: 'features',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  description: 'description'
};

exports.Prisma.AnomalyScalarFieldEnum = {
  id: 'id',
  type: 'type',
  severity: 'severity',
  title: 'title',
  description: 'description',
  metric: 'metric',
  currentValue: 'currentValue',
  expectedValue: 'expectedValue',
  deviation: 'deviation',
  confidence: 'confidence',
  detectedAt: 'detectedAt',
  status: 'status',
  category: 'category',
  impact: 'impact',
  owner: 'owner',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnomalyNoteScalarFieldEnum = {
  id: 'id',
  anomalyId: 'anomalyId',
  at: 'at',
  text: 'text'
};

exports.Prisma.AnomalyModelScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  sensitivity: 'sensitivity',
  detectionRate: 'detectionRate',
  falsePositiveRate: 'falsePositiveRate',
  lastTrained: 'lastTrained',
  metrics: 'metrics'
};

exports.Prisma.WorkflowRuleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  trigger: 'trigger',
  actions: 'actions',
  isActive: 'isActive',
  executionCount: 'executionCount',
  lastExecuted: 'lastExecuted',
  createdAt: 'createdAt',
  category: 'category'
};

exports.Prisma.ApiKeyScalarFieldEnum = {
  id: 'id',
  name: 'name',
  keyHash: 'keyHash',
  keyMasked: 'keyMasked',
  scopes: 'scopes',
  createdAt: 'createdAt',
  lastUsed: 'lastUsed',
  expiresAt: 'expiresAt',
  revoked: 'revoked'
};

exports.Prisma.IntegrationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  settings: 'settings'
};

exports.Prisma.WebhookScalarFieldEnum = {
  id: 'id',
  url: 'url',
  secret: 'secret',
  active: 'active',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  timestamp: 'timestamp',
  userId: 'userId',
  userName: 'userName',
  userRole: 'userRole',
  action: 'action',
  resource: 'resource',
  resourceId: 'resourceId',
  ipAddress: 'ipAddress',
  severity: 'severity',
  category: 'category',
  status: 'status',
  details: 'details'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  message: 'message',
  priority: 'priority',
  read: 'read',
  link: 'link',
  data: 'data',
  createdAt: 'createdAt'
};

exports.Prisma.AiInsightScalarFieldEnum = {
  id: 'id',
  type: 'type',
  title: 'title',
  description: 'description',
  confidence: 'confidence',
  impact: 'impact',
  category: 'category',
  data: 'data',
  actionable: 'actionable',
  priority: 'priority',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  userId: 'userId'
};

exports.Prisma.KnowledgeBaseCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KnowledgeBaseArticleScalarFieldEnum = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  content: 'content',
  categoryId: 'categoryId',
  authorId: 'authorId',
  status: 'status',
  tags: 'tags',
  views: 'views',
  helpful: 'helpful',
  notHelpful: 'notHelpful',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FAQScalarFieldEnum = {
  id: 'id',
  question: 'question',
  answer: 'answer',
  order: 'order',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PredictiveModelScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  accuracy: 'accuracy',
  lastTrained: 'lastTrained',
  predictions: 'predictions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NPSResponseScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  userName: 'userName',
  userEmail: 'userEmail',
  planType: 'planType',
  daysSinceSignup: 'daysSinceSignup',
  score: 'score',
  category: 'category',
  qualitativeFeedback: 'qualitativeFeedback',
  tags: 'tags',
  triggerContext: 'triggerContext',
  timestamp: 'timestamp',
  processed: 'processed',
  actionTaken: 'actionTaken',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuoteScalarFieldEnum = {
  id: 'id',
  patientName: 'patientName',
  patientPhone: 'patientPhone',
  examType: 'examType',
  urgency: 'urgency',
  description: 'description',
  status: 'status',
  valorEstimado: 'valorEstimado',
  crmStatus: 'crmStatus',
  crmNextContact: 'crmNextContact',
  crmNotes: 'crmNotes',
  crmResponsavel: 'crmResponsavel',
  crmMotivoPerda: 'crmMotivoPerda',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  coupon: 'coupon',
  discount: 'discount',
  appointmentDate: 'appointmentDate',
  displayId: 'displayId',
  partnerId: 'partnerId',
  imageUrl: 'imageUrl',
  patientId: 'patientId'
};

exports.Prisma.AvailabilityRequestScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  partnerId: 'partnerId',
  specialty: 'specialty',
  date: 'date',
  time: 'time',
  urgency: 'urgency',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  suggestedSlots: 'suggestedSlots'
};

exports.Prisma.MedicalRecordPermissionScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  professionalId: 'professionalId',
  appointmentId: 'appointmentId',
  status: 'status',
  requestedAt: 'requestedAt',
  respondedAt: 'respondedAt',
  expiresAt: 'expiresAt',
  reason: 'reason',
  permissions: 'permissions',
  patientResponse: 'patientResponse',
  professionalInfo: 'professionalInfo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WearableConnectionScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  platform: 'platform',
  connected: 'connected',
  connectedAt: 'connectedAt',
  lastSync: 'lastSync',
  permissions: 'permissions',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken'
};

exports.Prisma.CouponScalarFieldEnum = {
  id: 'id',
  code: 'code',
  description: 'description',
  discount: 'discount',
  type: 'type',
  maxUses: 'maxUses',
  usedCount: 'usedCount',
  expiresAt: 'expiresAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ValidationCodeLogScalarFieldEnum = {
  id: 'id',
  code: 'code',
  status: 'status',
  timestamp: 'timestamp',
  partnerId: 'partnerId',
  patientId: 'patientId',
  appointmentId: 'appointmentId',
  partnerName: 'partnerName',
  patientName: 'patientName',
  errorMessage: 'errorMessage'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  id: 'id',
  email: 'email',
  token: 'token',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.PatientDailyTaskScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  task: 'task',
  xp: 'xp',
  icon: 'icon',
  completed: 'completed',
  date: 'date',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatientInsightScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  type: 'type',
  title: 'title',
  description: 'description',
  priority: 'priority',
  category: 'category',
  actionable: 'actionable',
  isRead: 'isRead',
  isDismissed: 'isDismissed',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  User: 'User',
  ChatHistory: 'ChatHistory',
  Admin: 'Admin',
  Role: 'Role',
  Appointment: 'Appointment',
  Transaction: 'Transaction',
  Transfer: 'Transfer',
  PartnerFinancialData: 'PartnerFinancialData',
  PartnerService: 'PartnerService',
  ServiceCategory: 'ServiceCategory',
  Challenge: 'Challenge',
  PatientBadge: 'PatientBadge',
  PatientReward: 'PatientReward',
  HealthLog: 'HealthLog',
  Badge: 'Badge',
  Review: 'Review',
  Reward: 'Reward',
  LoyaltyTier: 'LoyaltyTier',
  LoyaltyCampaign: 'LoyaltyCampaign',
  LoyaltyConfig: 'LoyaltyConfig',
  MedicalRecord: 'MedicalRecord',
  Prescription: 'Prescription',
  MedicationReminder: 'MedicationReminder',
  MedicalHistory: 'MedicalHistory',
  Anamnesis: 'Anamnesis',
  HealthExam: 'HealthExam',
  Partner: 'Partner',
  TeamMember: 'TeamMember',
  PartnerDocument: 'PartnerDocument',
  Patient: 'Patient',
  PatientGoal: 'PatientGoal',
  FavoritePartner: 'FavoritePartner',
  PatientChallenge: 'PatientChallenge',
  AchievementShare: 'AchievementShare',
  PointsHistory: 'PointsHistory',
  XPTransaction: 'XPTransaction',
  Report: 'Report',
  AutomatedReport: 'AutomatedReport',
  AnalyticsEvent: 'AnalyticsEvent',
  AbTestConversion: 'AbTestConversion',
  AnalyticsAlert: 'AnalyticsAlert',
  Subscription: 'Subscription',
  SupportTicket: 'SupportTicket',
  SupportMessage: 'SupportMessage',
  Plan: 'Plan',
  Anomaly: 'Anomaly',
  AnomalyNote: 'AnomalyNote',
  AnomalyModel: 'AnomalyModel',
  WorkflowRule: 'WorkflowRule',
  ApiKey: 'ApiKey',
  Integration: 'Integration',
  Webhook: 'Webhook',
  AuditLog: 'AuditLog',
  Notification: 'Notification',
  AiInsight: 'AiInsight',
  KnowledgeBaseCategory: 'KnowledgeBaseCategory',
  KnowledgeBaseArticle: 'KnowledgeBaseArticle',
  FAQ: 'FAQ',
  PredictiveModel: 'PredictiveModel',
  NPSResponse: 'NPSResponse',
  Quote: 'Quote',
  AvailabilityRequest: 'AvailabilityRequest',
  MedicalRecordPermission: 'MedicalRecordPermission',
  WearableConnection: 'WearableConnection',
  Coupon: 'Coupon',
  ValidationCodeLog: 'ValidationCodeLog',
  VerificationToken: 'VerificationToken',
  PatientDailyTask: 'PatientDailyTask',
  PatientInsight: 'PatientInsight'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
