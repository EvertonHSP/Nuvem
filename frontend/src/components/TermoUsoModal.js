// TermoUsoModal.js
import React from 'react';
import './style/TermoUsoModal.css'; // Estilos específicos para o modal

const TermoUsoModal = ({ conteudo, versao, onAccept, onReject }) => {
  return (
    <div className="termo-modal-overlay">
      <div className="termo-modal-container">
        <div className="termo-modal-header">
          <h2>Termos de Uso (Versão {versao})</h2>
        </div>
        <div className="termo-modal-content">
          <div dangerouslySetInnerHTML={{ __html: conteudo }} />
        </div>
        <div className="termo-modal-footer">
          <button 
            className="termo-reject-btn"
            onClick={onReject}
          >
            Recusar
          </button>
          <button 
            className="termo-accept-btn"
            onClick={onAccept}
          >
            Aceitar Termos
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermoUsoModal;