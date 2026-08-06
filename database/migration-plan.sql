-- Migraçªıo para adicionar/validar coluna plan na tabela tenants
-- Esta migraçªıo garante que apenas valores válidos (Basic, Premium, Enterprise) sejam aceitos

-- =====================================================
-- Para MySQL/MariaDB
-- =====================================================

-- Se a coluna não existir, adicionar
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'Basic';

-- Atualizar valores NULL ou inváıılidos para 'Basic'
UPDATE tenants 
SET plan = 'Basic' 
WHERE plan IS NULL 
   OR plan NOT IN ('Basic', 'Premium', 'Enterprise');

-- Adicionar constraint CHECK para validar valores (MySQL 8.0+)
ALTER TABLE tenants 
MODIFY COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'Basic'
CHECK (plan IN ('Basic', 'Premium', 'Enterprise'));

-- =====================================================
-- Para PostgreSQL
-- =====================================================

-- Criar tipo ENUM se não existir
DO $$ BEGIN
    CREATE TYPE tenant_plan AS ENUM ('Basic', 'Premium', 'Enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alterar coluna para usar o ENUM
ALTER TABLE tenants 
ALTER COLUMN plan TYPE tenant_plan 
USING CASE 
    WHEN plan IN ('Basic', 'Premium', 'Enterprise') THEN plan::tenant_plan
    ELSE 'Basic'::tenant_plan
END;

-- Definir valor default
ALTER TABLE tenants 
ALTER COLUMN plan SET DEFAULT 'Basic';

-- =====================================================
-- Para SQLite
-- =====================================================

-- SQLite não suporta ALTER COLUMN, então precisamos recriar a tabela
PRAGMA foreign_keys=OFF;

-- Criar nova tabela com constraint
CREATE TABLE IF NOT EXISTS tenants_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'Basic' CHECK (plan IN ('Basic', 'Premium', 'Enterprise')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copiar dados existentes
INSERT INTO tenants_new (id, name, slug, plan, createdAt, updatedAt)
SELECT 
    id, 
    name, 
    slug, 
    CASE 
        WHEN plan IN ('Basic', 'Premium', 'Enterprise') THEN plan
        ELSE 'Basic'
    END as plan,
    createdAt,
    updatedAt
FROM tenants;

-- Dropar tabela antiga e renomear nova
DROP TABLE IF EXISTS tenants;
ALTER TABLE tenants_new RENAME TO tenants;

PRAGMA foreign_keys=ON;

-- =====================================================
-- Index para performance (opcional, mas recomendado)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- =====================================================
-- Dados de seed para testes (opcional)
-- =====================================================

-- Inserir tenants de exemplo com diferentes planos
-- INSERT INTO tenants (id, name, slug, plan, createdAt, updatedAt)
-- VALUES 
--     ('tenant-basic-001', 'Pousada Basic', 'pousada-basic', 'Basic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--     ('tenant-premium-001', 'Pousada Premium', 'pousada-premium', 'Premium', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--     ('tenant-enterprise-001', 'Resort Enterprise', 'resort-enterprise', 'Enterprise', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
