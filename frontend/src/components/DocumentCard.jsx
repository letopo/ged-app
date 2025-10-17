const DocumentCard = ({ document, onDelete }) => {
  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📄'; // Amélioré pour PDF
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return '📊'; // Amélioré pour Excel
    if (mimeType?.includes('image')) return '🖼️'; // Amélioré pour Image
    return '📁'; // Icône par défaut
  };

  const formatFileSize = (bytes) => {
    // Ajout d'une sécurité pour éviter le NaN
    if (!bytes || isNaN(bytes)) return '0 MB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      facture: '#28a745',
      contrat: '#007bff',
      courrier: '#17a2b8',
      rapport: '#ffc107',
      formulaire: '#6f42c1',
      autre: '#6c757d'
    };
    return colors[category] || colors.autre;
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ fontSize: '32px' }}>
          {/* CORRECTION: Utiliser document.type */}
          {getFileIcon(document.type)}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{document.title}</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
            {/* CORRECTION: Utiliser document.originalName pour le nom d'origine */}
            {document.originalName}
          </p>
        </div>
      </div>

      {document.description && (
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
          {document.description}
        </p>
      )}

      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <span style={{
          padding: '4px 8px',
          borderRadius: '3px',
          fontSize: '12px',
          color: 'white',
          fontWeight: '500',
          background: getCategoryColor(document.category)
        }}>
          {document.category}
        </span>
        <span style={{
          padding: '4px 8px',
          borderRadius: '3px',
          fontSize: '12px',
          color: 'white',
          fontWeight: '500',
          background: document.status === 'validated' ? '#28a745' : 
                      document.status === 'pending_validation' ? '#ffc107' : 
                      document.status === 'rejected' ? '#dc3545' : '#6c757d'
        }}>
          {document.status}
        </span>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: '12px', 
        color: '#666',
        borderTop: '1px solid #eee',
        paddingTop: '10px'
      }}>
        {/* CORRECTION: Utiliser document.size */}
        <span>{formatFileSize(document.size)}</span>
        <span>{formatDate(document.createdAt)}</span>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        {/* CORRECTION: Utiliser document.path */}
        <a
          href={`http://localhost:3000/${document.path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
        >
           Télécharger
        </a>
        <button
          onClick={() => onDelete(document.id)}
          className="btn btn-danger"
          style={{ flex: 1 }}
        >
           Supprimer
        </button>
      </div>
    </div>
  );
};

export default DocumentCard;