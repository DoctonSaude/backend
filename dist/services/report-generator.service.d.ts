import { Buffer } from 'buffer';
export interface ReportData {
    title: string;
    columns: string[];
    rows: any[];
    totalCount: number;
}
export declare class ReportGeneratorService {
    private static LOGO_PATH;
    /**
     * Busca os dados reais baseados no tipo de relatório
     */
    static fetchReportData(type: string, start: Date, end: Date, filters?: any): Promise<ReportData>;
    /**
     * Gera um PDF e retorna um Buffer
     */
    static generatePDF(data: ReportData): Promise<Buffer>;
    /**
     * Gera um Excel e retorna um Buffer
     */
    static generateExcel(data: ReportData): Promise<Buffer>;
}
//# sourceMappingURL=report-generator.service.d.ts.map