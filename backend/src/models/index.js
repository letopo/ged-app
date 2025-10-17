// backend/src/models/index.js
import User from './User.js';
import Document from './Document.js';
import Workflow from './Workflow.js';

// Relations User <-> Document
Document.belongsTo(User, { 
  foreignKey: 'user_id',
  as: 'user' 
});

User.hasMany(Document, { 
  foreignKey: 'user_id',
  as: 'documents' 
});

// Relations Workflow <-> Document
Workflow.belongsTo(Document, { 
  foreignKey: 'document_id', 
  as: 'document' 
});

Document.hasMany(Workflow, { 
  foreignKey: 'document_id',
  as: 'workflows'
});

// Relations Workflow <-> User (validator)
Workflow.belongsTo(User, { 
  foreignKey: 'validator_id', 
  as: 'validator' 
});

User.hasMany(Workflow, { 
  foreignKey: 'validator_id',
  as: 'validationTasks'
});

// Export tous les modèles
export { User, Document, Workflow };
export default { User, Document, Workflow };