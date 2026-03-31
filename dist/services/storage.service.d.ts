export declare class StorageService {
    private static readonly BUCKET_PRESCRIPTIONS;
    private static readonly BUCKET_DOCUMENTS;
    private static readonly BUCKET_AVATARS;
    /**
     * Upload de Avatar (usado em patient.routes.ts)
     */
    uploadAvatar(fileBody: Buffer, fileName: string, contentType: string): Promise<string>;
    /**
     * Upload Genérico (usado em patient.routes.ts)
     */
    uploadFile(fileBody: Buffer, fileName: string, contentType: string, folder?: string): Promise<string>;
    /**
     * Upload de Receita Médica
     */
    uploadPrescription(patientId: string, fileName: string, fileBody: Buffer, contentType: string): Promise<{
        path: string;
        url: string;
    }>;
    /**
     * Lógica base de upload para o Supabase
     */
    private static uploadToBucket;
    /**
     * Deleta um arquivo do storage
     */
    deleteFile(bucket: string, path: string): Promise<boolean>;
}
export declare const storageService: StorageService;
//# sourceMappingURL=storage.service.d.ts.map