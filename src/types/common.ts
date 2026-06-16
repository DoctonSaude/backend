// Tipos comuns para uso no backend

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CompanyData {
  name: string;
  economicGroupId: string;
  cnpj?: string;
  description?: string;
  isActive?: boolean;
}

export interface PharmacyData {
  name: string;
  economicGroupId: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export interface WebhookData {
  [key: string]: any;
}

export interface AppointmentData {
  id: string;
  patientId: string;
  partnerId: string;
  dateTime: Date;
  status: string;
  [key: string]: any;
}

export interface HealthLogData {
  id: string;
  patientId: string;
  type: string;
  value: any;
  timestamp: Date;
  [key: string]: any;
}

export interface PatientChallengeData {
  id: string;
  patientId: string;
  challengeId: string;
  status: string;
  completedAt?: Date;
  [key: string]: any;
}

export interface PatientBadgeData {
  id: string;
  patientId: string;
  badgeId: string;
  earnedAt: Date;
  [key: string]: any;
}

export interface PaymentData {
  id: string;
  patientId?: string;
  partnerId?: string;
  amount: number;
  status: string;
  method: string;
  [key: string]: any;
}
