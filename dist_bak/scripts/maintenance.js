"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });
async function maintenance() {
    const { supabase } = await Promise.resolve().then(() => __importStar(require('../lib/supabase.js')));
    const { default: prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma.js')));
    console.log('🚀 Iniciando script de manutenção...');
    // 1. Configuração do Bucket no Supabase
    try {
        console.log('\n📦 Verificando bucket "docton-assets"...');
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) {
            throw listError;
        }
        const bucketExists = buckets.find(b => b.name === 'docton-assets');
        if (!bucketExists) {
            console.log('🏗️ Criando bucket "docton-assets"...');
            const { error: createError } = await supabase.storage.createBucket('docton-assets', {
                public: true,
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
                fileSizeLimit: 10485760 // 10MB
            });
            if (createError) {
                console.error('❌ Erro ao criar bucket:', createError.message);
            }
            else {
                console.log('✅ Bucket "docton-assets" criado com sucesso!');
            }
        }
        else {
            console.log('✅ Bucket "docton-assets" já existe.');
            // Garantir que está público (update)
            if (!bucketExists.public) {
                console.log('🔓 Tornando bucket "docton-assets" público...');
                const { error: updateError } = await supabase.storage.updateBucket('docton-assets', {
                    public: true
                });
                if (updateError)
                    console.error('❌ Erro ao atualizar bucket:', updateError.message);
                else
                    console.log('✅ Bucket agora é público.');
            }
        }
    }
    catch (error) {
        console.error('❌ Erro na configuração do Storage:', error.message || error);
    }
    // 2. Limpeza de Avatares Base64
    try {
        console.log('\n🧹 Limpando avatares em formato Base64 do banco...');
        // Buscar usuários com avatar começando com "data:image"
        const usersWithBase64 = await prisma.user.findMany({
            where: {
                avatar: {
                    startsWith: 'data:image'
                }
            },
            select: {
                id: true,
                name: true
            }
        });
        console.log(`🔍 Encontrados ${usersWithBase64.length} usuários com avatar em Base64.`);
        if (usersWithBase64.length > 0) {
            const { count } = await prisma.user.updateMany({
                where: {
                    avatar: {
                        startsWith: 'data:image'
                    }
                },
                data: {
                    avatar: null // Resetar para null, o frontend usará o fallback do Dicebear
                }
            });
            console.log(`✅ ${count} registros limpos com sucesso.`);
        }
        else {
            console.log('✨ Nenhum registro Base64 encontrado para limpar.');
        }
    }
    catch (error) {
        console.error('❌ Erro na limpeza do banco (User):', error.message || error);
    }
    // 3. Limpeza de Avatares Base64 em TeamMember
    try {
        console.log('\n🧹 Limpando avatares em formato Base64 de TeamMember...');
        const membersWithBase64 = await prisma.teamMember.findMany({
            where: {
                avatar: {
                    startsWith: 'data:image'
                }
            }
        });
        console.log(`🔍 Encontrados ${membersWithBase64.length} membros de equipe com avatar em Base64.`);
        if (membersWithBase64.length > 0) {
            const { count } = await prisma.teamMember.updateMany({
                where: {
                    avatar: {
                        startsWith: 'data:image'
                    }
                },
                data: {
                    avatar: null
                }
            });
            console.log(`✅ ${count} membros de equipe limpos.`);
        }
    }
    catch (error) {
        console.error('❌ Erro na limpeza do banco (TeamMember):', error.message || error);
    }
    console.log('\n🏁 Manutenção concluída!');
    process.exit(0);
}
maintenance();
//# sourceMappingURL=maintenance.js.map