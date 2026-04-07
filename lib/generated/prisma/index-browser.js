
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

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  domain: 'domain',
  isActive: 'isActive',
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
  permissionsJson: 'permissionsJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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
  tenantId: 'tenantId'
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

exports.Prisma.PartnerScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
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
  planTier: 'planTier',
  planStatus: 'planStatus',
  planExpiresAt: 'planExpiresAt',
  happyHourConfig: 'happyHourConfig',
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
  tenantId: 'tenantId',
  totalBadgesEarned: 'totalBadgesEarned',
  totalChallengesCompleted: 'totalChallengesCompleted',
  userIntent: 'userIntent',
  userPriority: 'userPriority',
  familyGroupId: 'familyGroupId',
  familyRole: 'familyRole'
};

exports.Prisma.FamilyGroupScalarFieldEnum = {
  id: 'id',
  name: 'name',
  ownerId: 'ownerId',
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
  equipmentId: 'equipmentId',
  professionalId: 'professionalId',
  doctonFee: 'doctonFee',
  partnerNetPrice: 'partnerNetPrice',
  commissionPercent: 'commissionPercent',
  availableAt: 'availableAt',
  payoutStatus: 'payoutStatus'
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
  updatedAt: 'updatedAt',
  appointmentId: 'appointmentId',
  content: 'content',
  signature: 'signature',
  signedAt: 'signedAt',
  isDigital: 'isDigital'
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

exports.Prisma.SymptomAnalysisScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  symptoms: 'symptoms',
  result: 'result',
  createdAt: 'createdAt'
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

exports.Prisma.ServiceComboScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  name: 'name',
  description: 'description',
  price: 'price',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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
  data: 'data',
  dataJson: 'dataJson',
  priority: 'priority',
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
  capacity: 'capacity',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EquipmentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  partnerId: 'partnerId',
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
  tenantId: 'tenantId',
  name: 'name'
};

exports.Prisma.PharmacyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  address: 'address',
  cnpj: 'cnpj',
  isApproved: 'isApproved',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  acceptedPayments: 'acceptedPayments',
  averagePriceVsMarket: 'averagePriceVsMarket',
  averageResponseTimeMinutes: 'averageResponseTimeMinutes',
  city: 'city',
  commissionPercent: 'commissionPercent',
  deliveryFee: 'deliveryFee',
  deliveryMinOrder: 'deliveryMinOrder',
  deliveryRadius: 'deliveryRadius',
  deliveryTimeAvg: 'deliveryTimeAvg',
  distanceScore: 'distanceScore',
  email: 'email',
  hasDelivery: 'hasDelivery',
  isActive: 'isActive',
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
  whatsapp: 'whatsapp'
};

exports.Prisma.PharmacyOrderScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  pharmacyId: 'pharmacyId',
  status: 'status',
  createdAt: 'createdAt',
  commissionAmount: 'commissionAmount',
  deliveryAddress: 'deliveryAddress',
  deliveryFee: 'deliveryFee',
  paymentMethod: 'paymentMethod',
  total: 'total',
  updatedAt: 'updatedAt'
};

exports.Prisma.PharmacyOrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  quantity: 'quantity',
  price: 'price'
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

exports.Prisma.BlockchainRecordScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  txHash: 'txHash',
  dataHash: 'dataHash',
  createdAt: 'createdAt'
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

exports.Prisma.AdminScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  permissions: 'permissions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  roleId: 'roleId'
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

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  status: 'status',
  total: 'total',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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
  updatedAt: 'updatedAt'
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

exports.Prisma.PharmacyMetricScalarFieldEnum = {
  id: 'id',
  pharmacyId: 'pharmacyId',
  type: 'type',
  value: 'value',
  metadata: 'metadata',
  date: 'date',
  createdAt: 'createdAt'
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

exports.Prisma.PartnerWalletScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  balance: 'balance',
  pendingBalance: 'pendingBalance',
  updatedAt: 'updatedAt'
};

exports.Prisma.PartnerTransactionScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  appointmentId: 'appointmentId',
  type: 'type',
  amount: 'amount',
  description: 'description',
  status: 'status',
  availableAt: 'availableAt',
  createdAt: 'createdAt'
};

exports.Prisma.PayoutRequestScalarFieldEnum = {
  id: 'id',
  partnerId: 'partnerId',
  amount: 'amount',
  status: 'status',
  bankDetails: 'bankDetails',
  processedAt: 'processedAt',
  createdAt: 'createdAt'
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
  Tenant: 'Tenant',
  AuditLog: 'AuditLog',
  Role: 'Role',
  Permission: 'Permission',
  User: 'User',
  Person: 'Person',
  Partner: 'Partner',
  Patient: 'Patient',
  FamilyGroup: 'FamilyGroup',
  Appointment: 'Appointment',
  Transaction: 'Transaction',
  MedicalRecord: 'MedicalRecord',
  Prescription: 'Prescription',
  MedicationReminder: 'MedicationReminder',
  MedicationLog: 'MedicationLog',
  Review: 'Review',
  SymptomAnalysis: 'SymptomAnalysis',
  SupportTicket: 'SupportTicket',
  SupportMessage: 'SupportMessage',
  HealthLog: 'HealthLog',
  PatientInsight: 'PatientInsight',
  HealthExam: 'HealthExam',
  MedicalHistory: 'MedicalHistory',
  Anamnesis: 'Anamnesis',
  PartnerService: 'PartnerService',
  ServiceCombo: 'ServiceCombo',
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
  HealthTip: 'HealthTip',
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
  Pharmacy: 'Pharmacy',
  PharmacyOrder: 'PharmacyOrder',
  PharmacyOrderItem: 'PharmacyOrderItem',
  PharmacyProduct: 'PharmacyProduct',
  PharmacyCustomer: 'PharmacyCustomer',
  BlockchainRecord: 'BlockchainRecord',
  MedicationSubscription: 'MedicationSubscription',
  NFTCertificate: 'NFTCertificate',
  ChatHistory: 'ChatHistory',
  Admin: 'Admin',
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
  Order: 'Order',
  OrderItem: 'OrderItem',
  UserProductStats: 'UserProductStats',
  QuotationRequest: 'QuotationRequest',
  QuotationResponse: 'QuotationResponse',
  PharmacyPromotion: 'PharmacyPromotion',
  PharmacyMetric: 'PharmacyMetric',
  PharmacyPerformanceSnapshot: 'PharmacyPerformanceSnapshot',
  PartnerWallet: 'PartnerWallet',
  PartnerTransaction: 'PartnerTransaction',
  PayoutRequest: 'PayoutRequest'
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
