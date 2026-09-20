// frontend/src/components/OnlyOfficeEditor.jsx
// OnlyOffice chargé dans une iframe sandboxée → empêche toute navigation du parent

import React, { useEffect, useRef, useState } from 'react';
import { Loader, AlertTriangle } from 'lucide-react';
import { documentsAPI } from '../services/api';

const OFFICE_EXTENSIONS = ['.docx', '.doc', '.odt', '.xlsx', '.xls', '.ods', '.pptx', '.ppt', '.odp'];

export function isOfficeFile(fileName = '') {
  const ext = (fileName || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  return OFFICE_EXTENSIONS.includes(ext);
}

function buildEditorHtml(onlyofficeUrl, editorConfig) {
  const configJson = JSON.stringify(editorConfig, null, 0);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Editor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #f3f4f6; }
    #editor { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="editor"></div>

  <script>
    window.onerror = function(msg, src, line) {
      window.parent.postMessage({ type: 'oo-error', detail: msg + ' (' + src + ':' + line + ')' }, '*');
      return true;
    };
    window.onunhandledrejection = function(e) {
      window.parent.postMessage({ type: 'oo-error', detail: String(e.reason) }, '*');
    };
  </script>

  <script src="${onlyofficeUrl}/web-apps/apps/api/documents/api.js"></script>

  <script>
    (function () {
      if (!window.DocsAPI) {
        window.parent.postMessage(
          { type: 'oo-error', detail: 'DocsAPI introuvable — serveur OnlyOffice démarré ?' },
          '*'
        );
        return;
      }

      var config = ${configJson};

      config.events = {
        onDocumentReady: function () {
          window.parent.postMessage({ type: 'oo-ready' }, '*');
        },
        onAppReady: function () {
          window.parent.postMessage({ type: 'oo-ready' }, '*');
        },
        onRequestClose: function () {
          window.parent.postMessage({ type: 'oo-close' }, '*');
        },
        onError: function (event) {
          window.parent.postMessage({ type: 'oo-error', detail: JSON.stringify(event) }, '*');
        },
      };

      try {
        new DocsAPI.DocEditor('editor', config);
      } catch (e) {
        window.parent.postMessage({ type: 'oo-error', detail: e.message }, '*');
      }
    })();
  </script>
</body>
</html>`;
}

const OnlyOfficeEditor = ({ documentId, onClose }) => {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [blobUrl, setBlobUrl] = useState(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const handleMessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      switch (msg.type) {
        case 'oo-ready':
          if (mounted) setStatus('ready');
          break;
        case 'oo-close':
          if (mounted && onClose) onClose();
          break;
        case 'oo-error':
          console.error('[OnlyOffice] Erreur iframe:', msg.detail);
          if (mounted) { setStatus('error'); setErrorMsg(msg.detail || 'Erreur lors du chargement du document.'); }
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    const initEditor = async () => {
      try {
        const { data } = await documentsAPI.getOnlyOfficeConfig(documentId);
        if (!mounted) return;

        const { config, token, onlyofficeUrl } = data;
        const editorConfig = { ...config, token };
        const html = buildEditorHtml(onlyofficeUrl, editorConfig);
        const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);

        if (!mounted) { URL.revokeObjectURL(url); return; }

        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (err) {
        console.error('[OnlyOffice] Erreur initialisation:', err);
        if (mounted) {
          setStatus('error');
          setErrorMsg(err.message || 'Impossible de contacter le serveur OnlyOffice.');
        }
      }
    };

    initEditor();

    return () => {
      mounted = false;
      window.removeEventListener('message', handleMessage);
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
  }, [documentId]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--surface-2)' }}>

      {/* Overlay chargement */}
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface)',
        }}>
          <Loader size={40} className="animate-spin" style={{ color: 'var(--brand)', marginBottom: 12 }} />
          <p style={{ fontWeight: 500, color: 'var(--fg)', fontSize: 14 }}>Chargement de l'éditeur…</p>
          <p style={{ color: 'var(--fg-muted)', fontSize: 13, marginTop: 4 }}>Connexion au serveur OnlyOffice</p>
        </div>
      )}

      {/* Overlay erreur */}
      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface)', padding: 32,
        }}>
          <div style={{ maxWidth: 448, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--danger-soft)', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={32} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>Éditeur indisponible</h3>
            <p style={{ color: 'var(--fg-muted)', fontSize: 13, marginBottom: 24 }}>
              {errorMsg || "Le serveur OnlyOffice est inaccessible. Vérifiez qu'il est démarré."}
            </p>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12,
              color: 'var(--fg-muted)', background: 'var(--surface-2)', borderRadius: 'var(--radius-2)',
              padding: 12, marginBottom: 16,
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', margin: 0 }}>docker compose up -d onlyoffice</p>
              <p style={{ margin: 0 }}>Puis rechargez la page.</p>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px', background: 'var(--brand)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-3)', fontSize: 13,
                cursor: 'pointer', transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-active)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {blobUrl && (
        <iframe
          src={blobUrl}
          style={{ width: '100%', height: '100%', border: 'none', display: status === 'error' ? 'none' : 'block' }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
          title="OnlyOffice Document Editor"
        />
      )}
    </div>
  );
};

export default OnlyOfficeEditor;
