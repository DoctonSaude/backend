
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

exports.Prisma.EconomicGroupScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  domain: 'domain',
  isActive: 'isActive',
  cnpj: 'cnpj',
  corporateName: 'corporateName',
  logoUrl: 'logoUrl',
  status: 'status',
  settings: 'settings',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  userName: 'userName',
  userRole: 'userRole',
  action: 'action',
  resource: 'resource',
  resourceId: 'resourceId',
  payload: 'payload',
  details: 'details',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  severity: 'severity',
  category: 'category',
  status: 'status',
  timestamp: 'timestamp',
  createdAt: 'createdAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  permissionsJson: 'permissionsJson'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PersonScalarFieldEnum = {
  id: 'id',
  name: 'name',
  phone: 'phone',
  avatar: 'avatar',
  metadata: 'metadata',
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
  metadataJson: 'metadataJson',
  patientId: 'patientId',
  partnerId: 'partnerId',
  client: 'client',
  dueDate: 'dueDate',
  paymentDate: 'paymentDate',
  dreCategory: 'dreCategory'
};

exports.Prisma.MedicalRecordScalarFieldEnum = {
  id: 'id',
  appointmentId: 'appointmentId',
  patientId: 'patientId',
  partnerId: 'partnerId',
  diagnosis: 'diagnosis',
  symptoms: 'symptoms',
  symptomsArray: 'symptomsArray',
  treatment: 'treatment',
  observations: 'observations',
  attachments: 'attachments',
  attachmentsArray: 'attachmentsArray',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  ipfsHash: 'ipfsHash',
  txHash: 'txHash',
  isSealed: 'isSealed'
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

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  appointmentId: 'appointmentId',
  partnerId: 'partnerId',
  patientId: 'patientId',
  rating: 'rating',
  comment: 'comment',
  reply: 'reply',
  replyDate: 'replyDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupportTicketScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  subject: 'subject',
  category: 'category',
  priority: 'priority',
  status: 'status',
  rating: 'rating',
  ratingComment: 'ratingComment',
  userEmail: 'userEmail',
  userName: 'userName',
  assignedToId: 'assignedToId',
  partnerId: 'partnerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupportMessageScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  message: 'message',
  sender: 'sender',
  createdAt: 'createdAt'
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

exports.Prisma.HealthCalculationScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  type: 'type',
  value: 'value',
  unit: 'unit',
  interpretation: 'interpretation',
  category: 'category',
  recommendations: 'recommendations',
  inputs: 'inputs',
  logDate: 'logDate',
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
  metadataJson: 'metadataJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SymptomAlertScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  title: 'title',
  description: 'description',
  severity: 'severity',
  category: 'category',
  isActive: 'isActive',
  isResolved: 'isResolved',
  resolvedAt: 'resolvedAt',
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

exports.Prisma.QuoteScalarFieldEnum = {
  id: 'id',
  displayId: 'displayId',
  patientId: 'patientId',
  patientName: 'patientName',
  patientPhone: 'patientPhone',
  examType: 'examType',
  urgency: 'urgency',
  description: 'description',
  imageUrl: 'imageUrl',
  status: 'status',
  partnerId: 'partnerId',
  crmStatus: 'crmStatus',
  crmNotes: 'crmNotes',
  crmNextContact: 'crmNextContact',
  crmResponsavel: 'crmResponsavel',
  crmMotivoPerda: 'crmMotivoPerda',
  responsavel: 'responsavel',
  valorEstimado: 'valorEstimado',
  appointmentDate: 'appointmentDate',
  proximoContato: 'proximoContato',
  coupon: 'coupon',
  discount: 'discount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MedicalQuoteScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  patientName: 'patientName',
  patientPhone: 'patientPhone',
  examType: 'examType',
  urgency: 'urgency',
  description: 'description',
  imageUrl: 'imageUrl',
  status: 'status',
  partnerId: 'partnerId',
  crmStatus: 'crmStatus',
  crmNotes: 'crmNotes',
  responsavel: 'responsavel',
  valorEstimado: 'valorEstimado',
  appointmentDate: 'appointmentDate',
  proximoContato: 'proximoContato',
  coupon: 'coupon',
  crmMotivoPerda: 'crmMotivoPerda',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PlanScalarFieldEnum = {
  id: 'id',
  key: 'key',
  name: 'name',
  price: 'price',
  duration: 'duration',
  interval: 'interval',
  features: 'features',
  featuresArray: 'featuresArray',
  isActive: 'isActive',
  description: 'description',
  ctaLink: 'ctaLink',
  ctaText: 'ctaText',
  displayPrice: 'displayPrice',
  isPopular: 'isPopular',
  order: 'order',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  planId: 'planId',
  status: 'status',
  paymentMethod: 'paymentMethod',
  startDate: 'startDate',
  startedAt: 'startedAt',
  endDate: 'endDate',
  cancelledAt: 'cancelledAt',
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
  createdBy: 'createdBy',
  sponsor: 'sponsor',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  imageUrl: 'imageUrl',
  approvalStatus: 'approvalStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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

exports.Prisma.VerificationTokenScalarFieldEnum = {
  id: 'id',
  token: 'token',
  email: 'email',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.PointsHistoryScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  points: 'points',
  action: 'action',
  description: 'description',
  metadata: 'metadata',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt'
};

exports.Prisma.BadgeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  rarity: 'rarity',
  category: 'category',
  isSecret: 'isSecret',
  points: 'points',
  criteria: 'criteria',
  criteriaJson: 'criteriaJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatientBadgeScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  badgeId: 'badgeId',
  unlockedAt: 'unlockedAt'
};

exports.Prisma.WearableConnectionScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  platform: 'platform',
  connected: 'connected',
  connectedAt: 'connectedAt',
  lastSync: 'lastSync',
  permissions: 'permissions',
  permissionsArray: 'permissionsArray',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  tokenExpiry: 'tokenExpiry'
};

exports.Prisma.RewardScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  imageUrl: 'imageUrl',
  pointsCost: 'pointsCost',
  category: 'category',
  isActive: 'isActive',
  status: 'status',
  stockQuantity: 'stockQuantity',
  discountPercent: 'discountPercent',
  partnerInfo: 'partnerInfo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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

exports.Prisma.AchievementShareScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  challengeId: 'challengeId',
  achievementTitle: 'achievementTitle',
  achievementType: 'achievementType',
  platform: 'platform',
  imageUrl: 'imageUrl',
  sharedAt: 'sharedAt',
  createdAt: 'createdAt'
};

exports.Prisma.LedgerAccountScalarFieldEnum = {
  id: 'id',
  personId: 'personId',
  name: 'name',
  type: 'type',
  currency: 'currency',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JournalEntryScalarFieldEnum = {
  id: 'id',
  transactionId: 'transactionId',
  description: 'description',
  amount: 'amount',
  debitAccountId: 'debitAccountId',
  creditAccountId: 'creditAccountId',
  metadata: 'metadata',
  timestamp: 'timestamp',
  createdAt: 'createdAt'
};

exports.Prisma.MedicalRecordAuditLogScalarFieldEnum = {
  id: 'id',
  medicalRecordId: 'medicalRecordId',
  accessorId: 'accessorId',
  accessorRole: 'accessorRole',
  action: 'action',
  timestamp: 'timestamp',
  metadata: 'metadata'
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
  permissionsJson: 'permissionsJson',
  patientResponse: 'patientResponse',
  patientResponseJson: 'patientResponseJson',
  professionalInfo: 'professionalInfo',
  professionalInfoJson: 'professionalInfoJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeamMemberScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  name: 'name',
  specialty: 'specialty',
  crm: 'crm',
  isActive: 'isActive',
  avatar: 'avatar',
  email: 'email',
  phone: 'phone',
  commissionPercentage: 'commissionPercentage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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

exports.Prisma.FavoritePartnerScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  partnerId: 'partnerId',
  createdAt: 'createdAt'
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
  suggestedSlots: 'suggestedSlots',
  suggestedSlotsJson: 'suggestedSlotsJson',
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

exports.Prisma.XPTransactionScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  actionId: 'actionId',
  actionName: 'actionName',
  baseXP: 'baseXP',
  bonusXP: 'bonusXP',
  finalXP: 'finalXP',
  multipliers: 'multipliers',
  context: 'context',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.LoyaltyTierScalarFieldEnum = {
  id: 'id',
  name: 'name',
  minPoints: 'minPoints',
  color: 'color',
  benefits: 'benefits',
  isActive: 'isActive',
  type: 'type',
  startDate: 'startDate',
  endDate: 'endDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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

exports.Prisma.AnalyticsEventScalarFieldEnum = {
  id: 'id',
  event: 'event',
  properties: 'properties',
  propertiesJson: 'propertiesJson',
  personId: 'personId',
  userId: 'userId',
  timestamp: 'timestamp',
  timestampBigInt: 'timestampBigInt',
  sessionId: 'sessionId',
  page: 'page',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  personId: 'personId',
  userId: 'userId',
  title: 'title',
  message: 'message',
  type: 'type',
  read: 'read',
  link: 'link',
  priority: 'priority',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  dataJson: 'dataJson'
};

exports.Prisma.InspirationalQuoteScalarFieldEnum = {
  id: 'id',
  content: 'content',
  author: 'author',
  category: 'category',
  responsavel: 'responsavel',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoomScalarFieldEnum = {
  id: 'id',
  name: 'name',
  partnerId: 'partnerId',
  unitId: 'unitId',
  capacity: 'capacity',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EquipmentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  partnerId: 'partnerId',
  unitId: 'unitId',
  status: 'status',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AppInstallationScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  platform: 'platform',
  version: 'version',
  createdAt: 'createdAt'
};

exports.Prisma.PixDepositScalarFieldEnum = {
  id: 'id',
  appointmentId: 'appointmentId',
  amount: 'amount',
  status: 'status',
  pixQrCode: 'pixQrCode',
  pixCopyPaste: 'pixCopyPaste',
  txId: 'txId',
  paidAt: 'paidAt',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ResearcherScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  institution: 'institution',
  specialty: 'specialty'
};

exports.Prisma.ResearchEnrollmentScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  researcherId: 'researcherId',
  status: 'status',
  consent: 'consent',
  createdAt: 'createdAt'
};

exports.Prisma.ExamAnalysisScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  examType: 'examType',
  finding: 'finding',
  summary: 'summary',
  createdAt: 'createdAt'
};

exports.Prisma.PredictiveAlertScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  message: 'message',
  severity: 'severity',
  isRead: 'isRead',
  createdAt: 'createdAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  content: 'content',
  sender: 'sender',
  createdAt: 'createdAt'
};

exports.Prisma.EmployeeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  companyId: 'companyId',
  role: 'role'
};

exports.Prisma.CompanyScalarFieldEnum = {
  id: 'id',
  economicGroupId: 'economicGroupId',
  name: 'name'
};

exports.Prisma.PharmacyOrderScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  pharmacyId: 'pharmacyId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  commissionAmount: 'commissionAmount',
  deliveryAddress: 'deliveryAddress',
  deliveryFee: 'deliveryFee',
  paymentMethod: 'paymentMethod',
  total: 'total'
};

exports.Prisma.PharmacyMetricScalarFieldEnum = {
  id: 'id',
  pharmacyId: 'pharmacyId',
  type: 'type',
  value: 'value',
  metadata: 'metadata',
  date: 'date',
  createdAt: 'createdAt'
};

exports.Prisma.PharmacyPromotionScalarFieldEnum = {
  id: 'id',
  pharmacyId: 'pharmacyId',
  title: 'title',
  description: 'description',
  originalPrice: 'originalPrice',
  promotionPrice: 'promotionPrice',
  imageUrl: 'imageUrl',
  startDate: 'startDate',
  endDate: 'endDate',
  isBoosted: 'isBoosted',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.BlockchainRecordScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  txHash: 'txHash',
  dataHash: 'dataHash',
  createdAt: 'createdAt'
};

exports.Prisma.NFTCertificateScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  tokenId: 'tokenId',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.ChatHistoryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  message: 'message',
  response: 'response',
  context: 'context',
  createdAt: 'createdAt'
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

exports.Prisma.WebsiteCTAScalarFieldEnum = {
  id: 'id',
  title: 'title',
  subtitle: 'subtitle',
  button_text: 'button_text',
  is_active: 'is_active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebsiteLeadScalarFieldEnum = {
  id: 'id',
  email: 'email',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebsiteContactScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  subject: 'subject',
  message: 'message',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TestimonialScalarFieldEnum = {
  id: 'id',
  name: 'name',
  role: 'role',
  content: 'content',
  rating: 'rating',
  avatar: 'avatar',
  isVerified: 'isVerified',
  order: 'order',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  productName: 'productName',
  productCategory: 'productCategory',
  quantity: 'quantity',
  price: 'price'
};

exports.Prisma.UserProductStatsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  productId: 'productId',
  productName: 'productName',
  lastPurchaseDate: 'lastPurchaseDate',
  averageIntervalDays: 'averageIntervalDays',
  purchaseCount: 'purchaseCount',
  isRecurring: 'isRecurring',
  confidenceScore: 'confidenceScore',
  nextEstimatedPurchase: 'nextEstimatedPurchase',
  daysUntilNextPurchase: 'daysUntilNextPurchase',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AcquiredLeadScalarFieldEnum = {
  id: 'id',
  businessName: 'businessName',
  phone: 'phone',
  city: 'city',
  category: 'category',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdminScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  permissions: 'permissions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  roleId: 'roleId'
};

exports.Prisma.AdminCampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  targetCity: 'targetCity',
  totalLeads: 'totalLeads',
  sentCount: 'sentCount',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  messageTemplate: 'messageTemplate',
  targetCategory: 'targetCategory'
};

exports.Prisma.AdminKnowledgeScalarFieldEnum = {
  id: 'id',
  assistantId: 'assistantId',
  type: 'type',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.AdminNeuralChainScalarFieldEnum = {
  id: 'id',
  assistantId: 'assistantId',
  triggerEvent: 'triggerEvent',
  delayMinutes: 'delayMinutes',
  actionPayload: 'actionPayload',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.AdminVirtualAssistantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  mode: 'mode',
  promptRole: 'promptRole',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdminWhatsappConnectionScalarFieldEnum = {
  id: 'id',
  instanceName: 'instanceName',
  role: 'role',
  status: 'status',
  lastQrCode: 'lastQrCode',
  connectedPhone: 'connectedPhone',
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
  updatedAt: 'updatedAt',
  roomId: 'roomId',
  unitId: 'unitId',
  equipmentId: 'equipmentId',
  professionalId: 'professionalId'
};

exports.Prisma.BlogPostScalarFieldEnum = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  content: 'content',
  excerpt: 'excerpt',
  category: 'category',
  author: 'author',
  image: 'image',
  published: 'published',
  isFeatured: 'isFeatured',
  metaTitle: 'metaTitle',
  metaDescription: 'metaDescription',
  metaKeywords: 'metaKeywords',
  scheduledAt: 'scheduledAt',
  views: 'views',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContactMessageScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  message: 'message',
  read: 'read',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FamilyGroupScalarFieldEnum = {
  id: 'id',
  name: 'name',
  ownerId: 'ownerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HealthTipScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  category: 'category',
  isActive: 'isActive',
  author: 'author',
  imageUrl: 'imageUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MedicationLogScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  medicationName: 'medicationName',
  dosage: 'dosage',
  scheduledTime: 'scheduledTime',
  takenTime: 'takenTime',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MedicationSubscriptionScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  pharmacyId: 'pharmacyId',
  medicationName: 'medicationName',
  dosage: 'dosage',
  quantity: 'quantity',
  frequencyDays: 'frequencyDays',
  nextRefillDate: 'nextRefillDate',
  status: 'status',
  discountPercent: 'discountPercent',
  autoRefill: 'autoRefill',
  paymentMethod: 'paymentMethod',
  lastRefillDate: 'lastRefillDate',
  totalRefills: 'totalRefills',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OCRDetectedDrugScalarFieldEnum = {
  id: 'id',
  processId: 'processId',
  name: 'name',
  dosage: 'dosage',
  quantity: 'quantity',
  price: 'price',
  createdAt: 'createdAt'
};

exports.Prisma.OCRProcessingScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  fileName: 'fileName',
  originalName: 'originalName',
  status: 'status',
  confidence: 'confidence',
  processingTimeMs: 'processingTimeMs',
  result: 'result',
  error: 'error',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OCRQuoteRequestScalarFieldEnum = {
  id: 'id',
  processId: 'processId',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  status: 'status',
  total: 'total',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PartnerScalarFieldEnum = {
  id: 'id',
  economicGroupId: 'economicGroupId',
  personId: 'personId',
  userId: 'userId',
  name: 'name',
  phone: 'phone',
  photo: 'photo',
  crm: 'crm',
  specialty: 'specialty',
  specialties: 'specialties',
  institution: 'institution',
  experience: 'experience',
  experienceYears: 'experienceYears',
  rating: 'rating',
  totalReviews: 'totalReviews',
  verified: 'verified',
  isApproved: 'isApproved',
  rejectionReason: 'rejectionReason',
  type: 'type',
  description: 'description',
  address: 'address',
  city: 'city',
  state: 'state',
  zipCode: 'zipCode',
  lat: 'lat',
  lng: 'lng',
  acceptsEmergency: 'acceptsEmergency',
  acceptsInsurance: 'acceptsInsurance',
  acceptsOnline: 'acceptsOnline',
  acceptsTelemedicine: 'acceptsTelemedicine',
  cnpj: 'cnpj',
  consultationPrice: 'consultationPrice',
  education: 'education',
  facilities: 'facilities',
  foundationYear: 'foundationYear',
  insurances: 'insurances',
  languages: 'languages',
  settings: 'settings',
  workingHours: 'workingHours',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PatientScalarFieldEnum = {
  id: 'id',
  createdAt: 'createdAt',
  address: 'address',
  allergies: 'allergies',
  birthDate: 'birthDate',
  bloodType: 'bloodType',
  chronicDiseases: 'chronicDiseases',
  city: 'city',
  cpf: 'cpf',
  currentMedications: 'currentMedications',
  currentStreak: 'currentStreak',
  emergencyContact: 'emergencyContact',
  emergencyPhone: 'emergencyPhone',
  gender: 'gender',
  healthPoints: 'healthPoints',
  lastActiveDate: 'lastActiveDate',
  level: 'level',
  longestStreak: 'longestStreak',
  state: 'state',
  updatedAt: 'updatedAt',
  userId: 'userId',
  zipCode: 'zipCode',
  archetype: 'archetype',
  blockchainAddress: 'blockchainAddress',
  dateOfBirth: 'dateOfBirth',
  encryptionPublicKey: 'encryptionPublicKey',
  experiencePoints: 'experiencePoints',
  healthGoals: 'healthGoals',
  levelTier: 'levelTier',
  levelTitle: 'levelTitle',
  lifestyle: 'lifestyle',
  medications: 'medications',
  onboardingCompleted: 'onboardingCompleted',
  personId: 'personId',
  referralCode: 'referralCode',
  referralCount: 'referralCount',
  referralEarnings: 'referralEarnings',
  referredBy: 'referredBy',
  settings: 'settings',
  economicGroupId: 'economicGroupId',
  totalBadgesEarned: 'totalBadgesEarned',
  totalChallengesCompleted: 'totalChallengesCompleted',
  userIntent: 'userIntent',
  userPriority: 'userPriority',
  journeyPhase: 'journeyPhase',
  nextAction: 'nextAction',
  abandonmentRisk: 'abandonmentRisk',
  engagementScore: 'engagementScore',
  healthScore: 'healthScore',
  familyGroupId: 'familyGroupId',
  familyRole: 'familyRole'
};

exports.Prisma.PharmacyScalarFieldEnum = {
  id: 'id',
  economicGroupId: 'economicGroupId',
  name: 'name',
  address: 'address',
  acceptedPayments: 'acceptedPayments',
  averagePriceVsMarket: 'averagePriceVsMarket',
  averageResponseTimeMinutes: 'averageResponseTimeMinutes',
  city: 'city',
  cnpj: 'cnpj',
  commissionPercent: 'commissionPercent',
  createdAt: 'createdAt',
  deliveryFee: 'deliveryFee',
  deliveryMinOrder: 'deliveryMinOrder',
  deliveryRadius: 'deliveryRadius',
  deliveryTimeAvg: 'deliveryTimeAvg',
  distanceScore: 'distanceScore',
  email: 'email',
  hasDelivery: 'hasDelivery',
  isActive: 'isActive',
  isApproved: 'isApproved',
  lat: 'lat',
  lng: 'lng',
  openingHours: 'openingHours',
  performanceScore: 'performanceScore',
  phone: 'phone',
  planScore: 'planScore',
  priceCompetitivenessScore: 'priceCompetitivenessScore',
  reasonSocial: 'reasonSocial',
  responseRateScore: 'responseRateScore',
  responseTimeScore: 'responseTimeScore',
  scoreUpdatedAt: 'scoreUpdatedAt',
  state: 'state',
  totalQuotesReceived: 'totalQuotesReceived',
  totalQuotesResponded: 'totalQuotesResponded',
  updatedAt: 'updatedAt',
  whatsapp: 'whatsapp',
  coverImage: 'coverImage',
  logo: 'logo',
  neighborhood: 'neighborhood',
  zipCode: 'zipCode'
};

exports.Prisma.PharmacyCustomerScalarFieldEnum = {
  id: 'id',
  pharmacyId: 'pharmacyId',
  patientId: 'patientId',
  orderCount: 'orderCount',
  totalSpent: 'totalSpent',
  isVIP: 'isVIP',
  lastOrder: 'lastOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PharmacyOrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  quantity: 'quantity',
  price: 'price'
};

exports.Prisma.PharmacyPerformanceSnapshotScalarFieldEnum = {
  id: 'id',
  pharmacyId: 'pharmacyId',
  responseTimeScore: 'responseTimeScore',
  responseRateScore: 'responseRateScore',
  priceCompetitivenessScore: 'priceCompetitivenessScore',
  distanceScore: 'distanceScore',
  planScore: 'planScore',
  overallScore: 'overallScore',
  totalQuotesReceived: 'totalQuotesReceived',
  totalQuotesResponded: 'totalQuotesResponded',
  averageResponseTimeMinutes: 'averageResponseTimeMinutes',
  averagePriceVsMarket: 'averagePriceVsMarket',
  regionalAveragePrice: 'regionalAveragePrice',
  competitorCount: 'competitorCount',
  marketShare: 'marketShare',
  date: 'date',
  createdAt: 'createdAt'
};

exports.Prisma.PharmacyProductScalarFieldEnum = {
  id: 'id',
  pharmacyId: 'pharmacyId',
  name: 'name',
  category: 'category',
  brand: 'brand',
  lab: 'lab',
  barcode: 'barcode',
  sku: 'sku',
  description: 'description',
  price: 'price',
  promotionPrice: 'promotionPrice',
  stock: 'stock',
  stockMin: 'stockMin',
  validity: 'validity',
  batch: 'batch',
  isActive: 'isActive',
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
  instructions: 'instructions',
  medications: 'medications',
  sideEffects: 'sideEffects',
  contraindications: 'contraindications',
  category: 'category',
  validUntil: 'validUntil',
  doctor: 'doctor',
  date: 'date',
  attachments: 'attachments',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuotationPaymentScalarFieldEnum = {
  id: 'id',
  quotationId: 'quotationId',
  responseId: 'responseId',
  patientId: 'patientId',
  amount: 'amount',
  status: 'status',
  asaasId: 'asaasId',
  paymentMethod: 'paymentMethod',
  pixQrCode: 'pixQrCode',
  pixCopyPaste: 'pixCopyPaste',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  paymentUrl: 'paymentUrl'
};

exports.Prisma.QuotationRequestScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  medicamentName: 'medicamentName',
  quantity: 'quantity',
  description: 'description',
  imageUrl: 'imageUrl',
  status: 'status',
  lat: 'lat',
  lng: 'lng',
  maxDistanceKm: 'maxDistanceKm',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deliveryType: 'deliveryType',
  genericPreference: 'genericPreference',
  type: 'type',
  urgency: 'urgency'
};

exports.Prisma.QuotationRequestItemScalarFieldEnum = {
  id: 'id',
  quotationId: 'quotationId',
  name: 'name',
  dosage: 'dosage',
  form: 'form',
  quantity: 'quantity'
};

exports.Prisma.QuotationResponseScalarFieldEnum = {
  id: 'id',
  quotationId: 'quotationId',
  pharmacyId: 'pharmacyId',
  price: 'price',
  isAvailable: 'isAvailable',
  deliveryTimeMin: 'deliveryTimeMin',
  observations: 'observations',
  status: 'status',
  responseTimeSec: 'responseTimeSec',
  createdAt: 'createdAt',
  expirationTime: 'expirationTime',
  itemsMatched: 'itemsMatched'
};

exports.Prisma.QuotationResponseItemScalarFieldEnum = {
  id: 'id',
  responseId: 'responseId',
  name: 'name',
  price: 'price',
  isGeneric: 'isGeneric'
};

exports.Prisma.SymptomAnalysisScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  symptoms: 'symptoms',
  result: 'result',
  createdAt: 'createdAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  role: 'role',
  name: 'name',
  phone: 'phone',
  avatar: 'avatar',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  department: 'department',
  emailVerified: 'emailVerified',
  jobTitle: 'jobTitle',
  personId: 'personId',
  pharmacyId: 'pharmacyId',
  preferredCurrency: 'preferredCurrency',
  preferredLanguage: 'preferredLanguage',
  economicGroupId: 'economicGroupId'
};

exports.Prisma.VideoContentScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  url: 'url',
  thumbnail: 'thumbnail',
  category: 'category',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MarketingCampaignScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  pharmacyId: 'pharmacyId',
  name: 'name',
  description: 'description',
  type: 'type',
  status: 'status',
  objective: 'objective',
  targetAudience: 'targetAudience',
  content: 'content',
  stats: 'stats',
  scheduledAt: 'scheduledAt',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CampaignTemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  category: 'category',
  type: 'type',
  objective: 'objective',
  baseContent: 'baseContent',
  previewUrl: 'previewUrl',
  usageCount: 'usageCount',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GrowthInsightScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  pharmacyId: 'pharmacyId',
  title: 'title',
  description: 'description',
  type: 'type',
  priority: 'priority',
  actionType: 'actionType',
  actionData: 'actionData',
  isRead: 'isRead',
  isExecuted: 'isExecuted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UnitScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  pharmacyId: 'pharmacyId',
  name: 'name',
  code: 'code',
  address: 'address',
  city: 'city',
  state: 'state',
  zipCode: 'zipCode',
  lat: 'lat',
  lng: 'lng',
  phone: 'phone',
  whatsapp: 'whatsapp',
  openingHours: 'openingHours',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CrmLeadScalarFieldEnum = {
  id: 'id',
  economicGroupId: 'economicGroupId',
  partnerId: 'partnerId',
  unitId: 'unitId',
  patientId: 'patientId',
  name: 'name',
  email: 'email',
  phone: 'phone',
  status: 'status',
  source: 'source',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentChargeScalarFieldEnum = {
  id: 'id',
  gatewayChargeId: 'gatewayChargeId',
  gatewayProvider: 'gatewayProvider',
  externalReference: 'externalReference',
  amount: 'amount',
  paymentMethod: 'paymentMethod',
  description: 'description',
  status: 'status',
  pixQrCode: 'pixQrCode',
  pixCopyPaste: 'pixCopyPaste',
  paymentUrl: 'paymentUrl',
  boletoLine: 'boletoLine',
  expiresAt: 'expiresAt',
  patientId: 'patientId',
  patientUserId: 'patientUserId',
  appointmentId: 'appointmentId',
  couponCode: 'couponCode',
  metadata: 'metadata',
  paidAt: 'paidAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HealthIntentScalarFieldEnum = {
  id: 'id',
  intent: 'intent',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  description: 'description',
  lat: 'lat',
  lng: 'lng',
  patientId: 'patientId',
  urgency: 'urgency',
  medicamentName: 'medicamentName',
  genericPreference: 'genericPreference',
  context: 'context'
};

exports.Prisma.AgentLogScalarFieldEnum = {
  id: 'id',
  agentId: 'agentId',
  prompt: 'prompt',
  response: 'response',
  tokensUsed: 'tokensUsed',
  createdAt: 'createdAt'
};

exports.Prisma.MarketingAssetScalarFieldEnum = {
  id: 'id',
  campaignId: 'campaignId',
  type: 'type',
  content: 'content',
  agentId: 'agentId',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.ContentScheduleScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  platform: 'platform',
  status: 'status',
  createdAt: 'createdAt',
  publishAt: 'publishAt'
};

exports.Prisma.BoostPriceScalarFieldEnum = {
  id: 'id',
  value: 'value',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.MarketingWebhookScalarFieldEnum = {
  id: 'id',
  url: 'url',
  event: 'event',
  isActive: 'isActive',
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
  EconomicGroup: 'EconomicGroup',
  AuditLog: 'AuditLog',
  Role: 'Role',
  Permission: 'Permission',
  Person: 'Person',
  Transaction: 'Transaction',
  MedicalRecord: 'MedicalRecord',
  MedicationReminder: 'MedicationReminder',
  Review: 'Review',
  SupportTicket: 'SupportTicket',
  SupportMessage: 'SupportMessage',
  HealthLog: 'HealthLog',
  HealthCalculation: 'HealthCalculation',
  PatientInsight: 'PatientInsight',
  SymptomAlert: 'SymptomAlert',
  HealthExam: 'HealthExam',
  MedicalHistory: 'MedicalHistory',
  Anamnesis: 'Anamnesis',
  PartnerService: 'PartnerService',
  ServiceCategory: 'ServiceCategory',
  Quote: 'Quote',
  MedicalQuote: 'MedicalQuote',
  Plan: 'Plan',
  Subscription: 'Subscription',
  Challenge: 'Challenge',
  PatientChallenge: 'PatientChallenge',
  VerificationToken: 'VerificationToken',
  PointsHistory: 'PointsHistory',
  Badge: 'Badge',
  PatientBadge: 'PatientBadge',
  WearableConnection: 'WearableConnection',
  Reward: 'Reward',
  PatientReward: 'PatientReward',
  AchievementShare: 'AchievementShare',
  LedgerAccount: 'LedgerAccount',
  JournalEntry: 'JournalEntry',
  MedicalRecordAuditLog: 'MedicalRecordAuditLog',
  MedicalRecordPermission: 'MedicalRecordPermission',
  TeamMember: 'TeamMember',
  PartnerDocument: 'PartnerDocument',
  FavoritePartner: 'FavoritePartner',
  AvailabilityRequest: 'AvailabilityRequest',
  ValidationCodeLog: 'ValidationCodeLog',
  Transfer: 'Transfer',
  PartnerFinancialData: 'PartnerFinancialData',
  PatientDailyTask: 'PatientDailyTask',
  XPTransaction: 'XPTransaction',
  LoyaltyTier: 'LoyaltyTier',
  LoyaltyCampaign: 'LoyaltyCampaign',
  LoyaltyConfig: 'LoyaltyConfig',
  AnalyticsEvent: 'AnalyticsEvent',
  Notification: 'Notification',
  InspirationalQuote: 'InspirationalQuote',
  Room: 'Room',
  Equipment: 'Equipment',
  AppInstallation: 'AppInstallation',
  PixDeposit: 'PixDeposit',
  Researcher: 'Researcher',
  ResearchEnrollment: 'ResearchEnrollment',
  ExamAnalysis: 'ExamAnalysis',
  PredictiveAlert: 'PredictiveAlert',
  Conversation: 'Conversation',
  Message: 'Message',
  Employee: 'Employee',
  Company: 'Company',
  PharmacyOrder: 'PharmacyOrder',
  PharmacyMetric: 'PharmacyMetric',
  PharmacyPromotion: 'PharmacyPromotion',
  BlockchainRecord: 'BlockchainRecord',
  NFTCertificate: 'NFTCertificate',
  ChatHistory: 'ChatHistory',
  KnowledgeBaseCategory: 'KnowledgeBaseCategory',
  KnowledgeBaseArticle: 'KnowledgeBaseArticle',
  FAQ: 'FAQ',
  PredictiveModel: 'PredictiveModel',
  NPSResponse: 'NPSResponse',
  WebsiteCTA: 'WebsiteCTA',
  WebsiteLead: 'WebsiteLead',
  WebsiteContact: 'WebsiteContact',
  Testimonial: 'Testimonial',
  PatientGoal: 'PatientGoal',
  Report: 'Report',
  AutomatedReport: 'AutomatedReport',
  Anomaly: 'Anomaly',
  AnomalyNote: 'AnomalyNote',
  AnomalyModel: 'AnomalyModel',
  WorkflowRule: 'WorkflowRule',
  ApiKey: 'ApiKey',
  Integration: 'Integration',
  Webhook: 'Webhook',
  AiInsight: 'AiInsight',
  OrderItem: 'OrderItem',
  UserProductStats: 'UserProductStats',
  AcquiredLead: 'AcquiredLead',
  Admin: 'Admin',
  AdminCampaign: 'AdminCampaign',
  AdminKnowledge: 'AdminKnowledge',
  AdminNeuralChain: 'AdminNeuralChain',
  AdminVirtualAssistant: 'AdminVirtualAssistant',
  AdminWhatsappConnection: 'AdminWhatsappConnection',
  Appointment: 'Appointment',
  BlogPost: 'BlogPost',
  ContactMessage: 'ContactMessage',
  FamilyGroup: 'FamilyGroup',
  HealthTip: 'HealthTip',
  MedicationLog: 'MedicationLog',
  MedicationSubscription: 'MedicationSubscription',
  OCRDetectedDrug: 'OCRDetectedDrug',
  OCRProcessing: 'OCRProcessing',
  OCRQuoteRequest: 'OCRQuoteRequest',
  Order: 'Order',
  Partner: 'Partner',
  Patient: 'Patient',
  Pharmacy: 'Pharmacy',
  PharmacyCustomer: 'PharmacyCustomer',
  PharmacyOrderItem: 'PharmacyOrderItem',
  PharmacyPerformanceSnapshot: 'PharmacyPerformanceSnapshot',
  PharmacyProduct: 'PharmacyProduct',
  Prescription: 'Prescription',
  QuotationPayment: 'QuotationPayment',
  QuotationRequest: 'QuotationRequest',
  QuotationRequestItem: 'QuotationRequestItem',
  QuotationResponse: 'QuotationResponse',
  QuotationResponseItem: 'QuotationResponseItem',
  SymptomAnalysis: 'SymptomAnalysis',
  User: 'User',
  VideoContent: 'VideoContent',
  MarketingCampaign: 'MarketingCampaign',
  CampaignTemplate: 'CampaignTemplate',
  GrowthInsight: 'GrowthInsight',
  Unit: 'Unit',
  CrmLead: 'CrmLead',
  PaymentCharge: 'PaymentCharge',
  HealthIntent: 'HealthIntent',
  AgentLog: 'AgentLog',
  MarketingAsset: 'MarketingAsset',
  ContentSchedule: 'ContentSchedule',
  BoostPrice: 'BoostPrice',
  MarketingWebhook: 'MarketingWebhook'
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
