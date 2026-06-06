// @ts-nocheck
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';

export const generateTestToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

export const testUser = {
  id: 'test-user-id',
  email: 'test@docton.com',
  role: 'PATIENT'
};

export const testPartner = {
  id: 'test-partner-id',
  userId: 'test-partner-user-id',
  role: 'PARTNER'
};
