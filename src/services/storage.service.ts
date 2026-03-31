import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

// Supabase client initialization for Storage
const supabase = createClient(
    env.SUPABASE_URL || process.env.SUPABASE_URL || '',
    env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export class StorageService {
    private static readonly BUCKET_PRESCRIPTIONS = 'prescriptions';
    private static readonly BUCKET_DOCUMENTS = 'patient-documents';
    private static readonly BUCKET_AVATARS = 'avatars';

    /**
     * Upload de Avatar (usado em patient.routes.ts)
     */
    async uploadAvatar(fileBody: Buffer, fileName: string, contentType: string) {
        const path = `avatars/${Date.now()}_${fileName}`;
        const result = await StorageService.uploadToBucket(StorageService.BUCKET_AVATARS, path, fileBody, contentType);
        return result.url;
    }

    /**
     * Upload Genérico (usado em patient.routes.ts)
     */
    async uploadFile(fileBody: Buffer, fileName: string, contentType: string, folder: string = 'others') {
        const path = `${folder}/${Date.now()}_${fileName}`;
        const result = await StorageService.uploadToBucket(StorageService.BUCKET_DOCUMENTS, path, fileBody, contentType);
        return result.url;
    }

    /**
     * Upload de Receita Médica
     */
    async uploadPrescription(patientId: string, fileName: string, fileBody: Buffer, contentType: string) {
        const path = `${patientId}/${Date.now()}_${fileName}`;
        return StorageService.uploadToBucket(StorageService.BUCKET_PRESCRIPTIONS, path, fileBody, contentType);
    }

    /**
     * Lógica base de upload para o Supabase
     */
    private static async uploadToBucket(
        bucket: string,
        path: string,
        fileBody: Buffer | Blob | ArrayBuffer,
        contentType: string = 'application/octet-stream'
    ) {
        try {
            logger.info(`Uploading file to bucket ${bucket}: ${path}`);

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
        } catch (err: any) {
            logger.error(`Failed to upload to Supabase Storage: ${err.message}`);
            throw err;
        }
    }

    /**
     * Deleta um arquivo do storage
     */
    async deleteFile(bucket: string, path: string) {
        try {
            const { error } = await supabase.storage.from(bucket).remove([path]);
            if (error) throw error;
            return true;
        } catch (err: any) {
            logger.error(`Failed to delete from Supabase Storage: ${err.message}`);
            return false;
        }
    }
}

export const storageService = new StorageService();
