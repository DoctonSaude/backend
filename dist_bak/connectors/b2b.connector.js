"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerB2BConnector = void 0;
const integrator_service_js_1 = __importDefault(require("../services/integrator.service.js"));
const company_crud_js_1 = require("../crud/company.crud.js");
const registerB2BConnector = () => {
    integrator_service_js_1.default.registerConnector({
        name: 'B2BCore',
        type: 'ERP', // Pode ser encarado como um ERP de RH
        execute: async (action, data) => {
            switch (action) {
                case 'GET_BENEFITS':
                    return await company_crud_js_1.CompanyCrud.getEmployeeBenefits(data.userId);
                case 'ENROLL_EMPLOYEE':
                    return await company_crud_js_1.CompanyCrud.addEmployee(data.companyId, data.userId, data.employeeData);
                case 'GENERATE_REPORT':
                    return await company_crud_js_1.CompanyCrud.generateUtilizationReport(data.companyId, data.period);
                default:
                    throw new Error(`Ação B2B não suportada: ${action}`);
            }
        }
    });
};
exports.registerB2BConnector = registerB2BConnector;
//# sourceMappingURL=b2b.connector.js.map