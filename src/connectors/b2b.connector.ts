import integratorService from '../services/integrator.service.js';
import { CompanyCrud } from '../crud/company.crud.js';

export const registerB2BConnector = () => {
    integratorService.registerConnector({
        name: 'B2BCore',
        type: 'ERP' as any, // Pode ser encarado como um ERP de RH
        execute: async (action: string, data) => {
            switch (action) {
                case 'GET_BENEFITS':
                    return await CompanyCrud.getEmployeeBenefits(data.userId);
                case 'ENROLL_EMPLOYEE':
                    return await CompanyCrud.addEmployee(data.companyId, data.userId, data.employeeData);
                case 'GENERATE_REPORT':
                    return await CompanyCrud.generateUtilizationReport(data.companyId, data.period);
                default:
                    throw new Error(`Ação B2B não suportada: ${action}`);
            }
        }
    });
};
