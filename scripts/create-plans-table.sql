-- Criação da tabela plans no Supabase
-- Execute este script no SQL Editor do painel do Supabase

-- 1. Criar a tabela
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC,
    interval TEXT,
    features TEXT,
    "featuresArray" TEXT[],
    "isActive" BOOLEAN DEFAULT true,
    "isPopular" BOOLEAN DEFAULT false,
    "displayPrice" TEXT,
    "order" INTEGER DEFAULT 0,
    "ctaLink" TEXT,
    "ctaText" TEXT,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas de acesso
-- Permitir leitura para todos (incluindo usuários anônimos)
CREATE POLICY "Enable read access for all users"
    ON public.plans
    FOR SELECT
    USING (true);

-- Permitir todas as operações para usuários autenticados (ou service role)
CREATE POLICY "Enable all access for authenticated users"
    ON public.plans
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Verificar se a tabela foi criada
SELECT * FROM public.plans;
