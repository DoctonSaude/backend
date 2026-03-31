"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_js_1 = require("../config/env.js");
const logger_js_1 = require("../lib/logger.js");
// Supabase client initialization for Storage
const supabase = (0, supabase_js_1.createClient)(env_js_1.env.SUPABASE_URL || process.env.SUPABASE_URL || '', env_js_1.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
class StorageService {
    static BUCKET_PRESCRIPTIONS = 'prescriptions';
    static BUCKET_DOCUMENTS = 'patient-documents';
    static BUCKET_AVATARS = 'avatars';
    /**
     * Upload de Avatar (usado em patient.routes.ts)
     */
    async uploadAvatar(fileBody, fileName, contentType) {
        const path = `avatars/${Date.now()}_${fileName}`;
        const result = await StorageService.uploadToBucket(StorageService.BUCKET_AVATARS, path, fileBody, contentType);
        return result.url;
    }
    /**
     * Upload Genérico (usado em patient.routes.ts)
     */
    async uploadFile(fileBody, fileName, contentType, folder = 'others') {
        const path = `${folder}/${Date.now()}_${fileName}`;
        const result = await StorageService.uploadToBucket(StorageService.BUCKET_DOCUMENTS, path, fileBody, contentType);
        return result.url;
    }
    /**
     * Upload de Receita Médica
     */
    async uploadPrescription(patientId, fileName, fileBody, contentType) {
        const path = `${patientId}/${Date.now()}_${fileName}`;
        return StorageService.uploadToBucket(StorageService.BUCKET_PRESCRIPTIONS, path, fileBody, contentType);
    }
    /**
     * Lógica base de upload para o Supabase
     */
    static async uploadToBucket(bucket, path, fileBody, contentType = 'application/octet-stream') {
        try {
            logger_js_1.logger.info(`Uploading file to bucket ${bucket}: ${path}`);
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, fileBody, {
                contentType,
                upsert: true
            });
            if (error) {
                throw error;
            }
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(path);
            return {
                path: data.path,
                url: publicUrl
            };
        }
        catch (err) {
            logger_js_1.logger.error(`Failed to upload to Supabase Storage: ${err.message}`);
            throw err;
        }
    }
    /**
     * Deleta um arquivo do storage
     */
    async deleteFile(bucket, path) {
        try {
            const { error } = await supabase.storage.from(bucket).remove([path]);
            if (error)
                throw error;
            return true;
        }
        catch (err) {
            logger_js_1.logger.error(`Failed to delete from Supabase Storage: ${err.message}`);
            return false;
        }
    }
}
exports.StorageService = StorageService;
exports.storageService = new StorageService();
//# sourceMappingURL=storage.service.js.map