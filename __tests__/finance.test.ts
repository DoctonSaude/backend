// Mock do Prisma para evitar conexões reais durante testes unitários
// Em ESM, o mock deve vir antes dos imports se possível, ou ser dinâmico
jest.mock('../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    partnerFinancialData: {
      findUnique: jest.fn(),
    },
  },
}));

import { financeService } from '../src/services/finance.service.js';
import prisma from '../src/lib/prisma.js';

describe('FinanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFees', () => {
    it('deve calcular a taxa padrão de 15% se não houver taxa customizada', async () => {
      prisma.partnerFinancialData.findUnique.mockResolvedValue(null);
      
      const amount = 1000;
      const partnerId = 'test-partner';
      
      const result = await financeService.calculateFees(amount, partnerId);
      
      expect(result.commissionPercent).toBe(15);
      expect(result.doctonFee).toBe(150);
      expect(result.partnerNetPrice).toBe(850);
    });

    it('deve usar a taxa customizada se estiver configurada no banco', async () => {
      prisma.partnerFinancialData.findUnique.mockResolvedValue({
        platformFeePercentage: 10
      });
      
      const amount = 1000;
      const partnerId = 'test-partner-custom';
      
      const result = await financeService.calculateFees(amount, partnerId);
      
      expect(result.commissionPercent).toBe(10);
      expect(result.doctonFee).toBe(100);
      expect(result.partnerNetPrice).toBe(900);
    });

    it('deve calcular o valor líquido corretamente para valores decimais', async () => {
      prisma.partnerFinancialData.findUnique.mockResolvedValue(null);
      
      const amount = 150.50;
      const partnerId = 'test-partner';
      
      const result = await financeService.calculateFees(amount, partnerId);
      
      expect(result.doctonFee).toBeCloseTo(22.575, 3);
      expect(result.partnerNetPrice).toBeCloseTo(127.925, 3);
    });
  });
});
