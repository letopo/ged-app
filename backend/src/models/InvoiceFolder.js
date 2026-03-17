import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const InvoiceFolder = sequelize.define('InvoiceFolder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('inbox', 'custom', 'container'), // 'container' pour le dossier parent PHP qui ne contient pas de fichiers directement
    defaultValue: 'custom',
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  parentId: { // ✅ AJOUT : Pour les sous-dossiers
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_id',
  }
}, {
  tableName: 'invoice_folders',
  timestamps: true,
  underscored: true,
});

InvoiceFolder.associate = function(models) {
  this.hasMany(models.Document, { foreignKey: 'invoiceFolderId', as: 'documents' });
  
  // Auto-référence pour les sous-dossiers
  this.hasMany(models.InvoiceFolder, { foreignKey: 'parentId', as: 'children' });
  this.belongsTo(models.InvoiceFolder, { foreignKey: 'parentId', as: 'parent' });
};

export default InvoiceFolder;