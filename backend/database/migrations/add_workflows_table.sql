-- Migration pour créer la table workflows
-- À exécuter dans votre base de données PostgreSQL

-- 1. Ajouter la colonne status au modèle documents (si elle n'existe pas déjà)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

ALTER TABLE documents 
ADD CONSTRAINT documents_status_check 
CHECK (status IN ('draft', 'pending_validation', 'validated', 'rejected', 'archived'));

-- 2. Créer la table workflows
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  validator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  step INTEGER NOT NULL DEFAULT 1,
  comment TEXT,
  validated_at TIMESTAMP WITH TIME ZONE,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT workflows_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 3. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_workflows_document_id ON workflows(document_id);
CREATE INDEX IF NOT EXISTS idx_workflows_validator_id ON workflows(validator_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_step ON workflows(step);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);

-- 4. Créer un index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_workflows_validator_status 
ON workflows(validator_id, status);

-- 5. Ajouter un commentaire sur la table
COMMENT ON TABLE workflows IS 'Table pour gérer les workflows de validation des documents';
COMMENT ON COLUMN workflows.status IS 'Statut de la tâche de validation (pending, approved, rejected)';
COMMENT ON COLUMN workflows.step IS 'Ordre dans le circuit de validation';
COMMENT ON COLUMN workflows.comment IS 'Commentaire du validateur lors de l''approbation ou du rejet';
COMMENT ON COLUMN workflows.notified IS 'Indique si le validateur a été notifié par email';

-- 6. Créer une fonction trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Créer le trigger sur la table workflows
DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();