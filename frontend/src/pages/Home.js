import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFiles } from '../context/FileContext';
import './style/home.css';
import { 
  FiFolder, 
  FiImage, 
  FiFileText, 
  FiFile, 
  FiGrid, 
  FiSliders,
  FiFilm,
  FiFileMinus
} from 'react-icons/fi';

// Componente para ícones de tipos de arquivo
const FileIcon = ({ type }) => {
  const iconMap = {
    // Pastas
    'folder': <FiFolder className="file-icon folder" size={20} />,
    
    // Imagens
    'image/': <FiImage className="file-icon image" size={20} />,
    
    // Vídeos (novo)
    'video/': <FiFilm className="file-icon video" size={20} />,
    
    // PDFs
    'application/pdf': <FiFileText className="file-icon pdf" size={20} />,
    
    // Documentos
    'text/': <FiFileText className="file-icon document" size={20} />,
    'application/msword': <FiFileText className="file-icon document" size={20} />,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': <FiFileText className="file-icon document" size={20} />,
    
    // Planilhas
    'application/vnd.ms-excel': <FiGrid className="file-icon spreadsheet" size={20} />,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': <FiGrid className="file-icon spreadsheet" size={20} />,
    
    // Apresentações
    'application/vnd.ms-powerpoint': <FiSliders className="file-icon presentation" size={20} />,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': <FiSliders className="file-icon presentation" size={20} />,
    
    // Compactados
    'application/zip': <FiFileMinus className="file-icon archive" size={20} />,
    'application/x-rar-compressed': <FiFileMinus className="file-icon archive" size={20} />,
    'application/x-7z-compressed': <FiFileMinus className="file-icon archive" size={20} />,
    
    // Padrão
    'default': <FiFile className="file-icon" size={20} />
  };

  const icon = Object.entries(iconMap).find(([key]) => 
    key.endsWith('/') ? type?.startsWith(key) : type === key
  )?.[1] || iconMap.default;

  return icon;
};


const Home = () => {
  const { user } = useAuth();
  const { 
    currentFolderContent, 
    loadFolderContent,
    uploadFile, 
    loadingStates,
    downloadFile,
    createFolder
  } = useFiles();
  
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const fileInputRef = useRef(null);
  const uploadMenuRef = useRef(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  // Carrega os arquivos ao montar o componente
  useEffect(() => {
    if (user) {
      loadFolderContent();
    }
  }, [user, loadFolderContent]);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target)) {
        setShowUploadMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const result = await uploadFile({
      file,
      isPublic: false,
      tags: [],
      description: '',
      folderId: currentFolderContent.folder?.id || null
    });

    if (result.success) {
      loadFolderContent(currentFolderContent.folder?.id || null);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Por favor, insira um nome para a pasta');
      return;
    }

    try {
      const parentFolderId = currentFolderContent.folder?.id || null;
      const result = await createFolder(newFolderName, parentFolderId);

      if (result.success) {
        setNewFolderName('');
        setShowCreateFolderModal(false);
        // Recarrega o conteúdo da pasta atual
        loadFolderContent(parentFolderId);
      } else {
        alert(result.error.message || 'Erro ao criar pasta');
      }
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      alert('Ocorreu um erro ao criar a pasta');
    }
  };


  // Agrupa arquivos por tipo

const groupFilesByType = () => {
  console.log('Grouping files...');
  if (!currentFolderContent || !currentFolderContent.files) {
    console.warn('currentFolderContent ou files está vazio');
    return {
      pastas: [],
      videos: [],
      imagens: [],
      documentos: [],
      planilhas: [],
      apresentacoes: [],
      pdfs: [],
      compactados: [],
      outros: []
    };
  }
  const groups = {
    pastas: currentFolderContent.subfolders,
    videos: [], 
    imagens: [],
    documentos: [],
    planilhas: [],
    apresentacoes: [],
    pdfs: [],
    compactados: [],
    outros: []
  };
  console.log('Files to group:', currentFolderContent.files);
  currentFolderContent.files.forEach(file => {
    const tipo = file.tipo || file.tipo_mime; // Usa tipo ou tipo_mime
    console.log(`File: ${file.nome}, Type: ${tipo}`);

    if (!tipo) {
      groups.outros.push(file);
      return;
    }

    if (tipo.startsWith('image/')) {
      groups.imagens.push(file);
    } else if (tipo.startsWith('video/')) { // Novo caso para vídeos
      groups.videos.push(file);
    } else if (tipo === 'application/pdf') {
      groups.pdfs.push(file);
    } else if (
      tipo.startsWith('text/') || 
      tipo.includes('word') ||
      tipo.includes('document') ||
      tipo === 'application/msword' ||
      tipo === 'application/rtf' ||
      tipo.includes('opendocument.text')
    ) {
      groups.documentos.push(file);
    } else if (
      tipo.includes('sheet') ||
      tipo.includes('excel') ||
      tipo.includes('spreadsheet') ||
      tipo === 'application/vnd.ms-excel' ||
      tipo.includes('opendocument.spreadsheet')
    ) {
      groups.planilhas.push(file);
    } else if (
      tipo.includes('presentation') ||
      tipo.includes('powerpoint') ||
      tipo === 'application/vnd.ms-powerpoint' ||
      tipo.includes('opendocument.presentation')
    ) {
      groups.apresentacoes.push(file);
    } else if (
      tipo.includes('zip') ||
      tipo.includes('rar') ||
      tipo.includes('7z') ||
      tipo.includes('compressed') ||
      tipo.includes('tar') ||
      tipo.includes('gzip')
    ) {
      groups.compactados.push(file);
    } else {
      groups.outros.push(file);
    }
  });
  console.log('Grouped files:', groups);
  return groups;
};


  const fileGroups = groupFilesByType();

  return (
    <div className="drive-container">
      <header className="drive-header">
        <div className="user-info">
          <h1>Meu Drive</h1>
          {user && <span className="user-email">{user.email}</span>}
        </div>
        
        <div className="actions-container" ref={uploadMenuRef}>
          <button 
            className="upload-btn"
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            disabled={loadingStates.upload}
          >
            {loadingStates.upload ? 'Enviando...' : '+'}
          </button>

          {showUploadMenu && (
            <div className="upload-menu">
              <button onClick={() => fileInputRef.current.click()}>
                Enviar Arquivo
              </button>

              <button onClick={() => {
                  setShowCreateFolderModal(true);
                  setShowUploadMenu(false);
                }}>
                  Criar Pasta
              </button>

            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </header>

      <main className="drive-content">
        {/* Breadcrumb de navegação */}
        <div className="breadcrumb">
          {currentFolderContent.path.map((item, index) => (
            <span 
              key={item.id || 'root'} 
              onClick={() => loadFolderContent(item.id)}
              className="breadcrumb-item"
            >
              {item.name}
              {index < currentFolderContent.path.length - 1 && ' > '}
            </span>
          ))}
        </div>

        {/* Lista de pastas */}
        {fileGroups.pastas.length > 0 && (
          <div className="file-section">
            <h3>Pastas</h3>
            <div className="files-grid">
              {fileGroups.pastas.map(folder => (
                <div 
                  key={folder.id} 
                  className="file-item folder"
                  onClick={() => loadFolderContent(folder.id)}
                >
                  <FileIcon type="folder" />
                  <span className="file-name">{folder.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de PDFs */}
        {fileGroups.pdfs.length > 0 && (
          <div className="file-section">
            <h3>PDFs</h3>
            <div className="files-grid">
              {fileGroups.pdfs.map(file => (
                <div 
                  key={file.id} 
                  className="file-item"
                  onClick={() => downloadFile(file.id)}
                >
                  <FileIcon type={file.tipo} />
                  <span className="file-name">{file.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Documentos */}
        {fileGroups.documentos.length > 0 && (
          <div className="file-section">
            <h3>Documentos</h3>
            <div className="files-grid">
              {fileGroups.documentos.map(file => (
                <div 
                  key={file.id} 
                  className="file-item"
                  onClick={() => downloadFile(file.id)}
                >
                  <FileIcon type={file.tipo} />
                  <span className="file-name">{file.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Imagens */}
        {fileGroups.imagens.length > 0 && (
          <div className="file-section">
            <h3>Imagens</h3>
            <div className="files-grid">
              {fileGroups.imagens.map(file => (
                <div 
                  key={file.id} 
                  className="file-item"
                  onClick={() => downloadFile(file.id)}
                >
                  <FileIcon type={file.tipo} />
                  <span className="file-name">{file.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Planilhas */}
        {fileGroups.planilhas.length > 0 && (
          <div className="file-section">
            <h3>Planilhas</h3>
            <div className="files-grid">
              {fileGroups.planilhas.map(file => (
                <div 
                  key={file.id} 
                  className="file-item"
                  onClick={() => downloadFile(file.id)}
                >
                  <FileIcon type={file.tipo || file.tipo} />
                  <span className="file-name">{file.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Apresentações */}
        {fileGroups.apresentacoes.length > 0 && (
          <div className="file-section">
            <h3>Apresentações</h3>
            <div className="files-grid">
              {fileGroups.apresentacoes.map(file => (
                <div 
                  key={file.id} 
                  className="file-item"
                  onClick={() => downloadFile(file.id)}
                >
                  <FileIcon type={file.tipo || file.tipo} />
                  <span className="file-name">{file.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Arquivos Compactados */}
        {fileGroups.compactados.length > 0 && (
          <div className="file-section">
            <h3>Arquivos Compactados</h3>
            <div className="files-grid">
              {fileGroups.compactados.map(file => (
                <div 
                  key={file.id} 
                  className="file-item"
                  onClick={() => downloadFile(file.id)}
                >
                  <FileIcon type={file.tipo || file.tipo} />
                  <span className="file-name">{file.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {fileGroups.videos.length > 0 && (
          <div className="file-section">
            <h3>Vídeos</h3>
            <div className="files-grid">
              {fileGroups.videos.map(file => (
                <div 
                  key={file.id} 
                  className="file-item"
                  onClick={() => downloadFile(file.id)}
                >
                  <FileIcon type={file.tipo} />
                  <span className="file-name">{file.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outros arquivos */}
        {fileGroups.outros.length > 0 && (
          <div className="file-section">
            <h3>Outros Arquivos</h3>
            <div className="files-grid">
              {fileGroups.outros.map(file => (
                <div 
                  key={file.id} 
                  className="file-item"
                  onClick={() => downloadFile(file.id)}
                >
                  <FileIcon type={file.tipo} />
                  <span className="file-name">{file.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensagem quando não há arquivos */}
        {Object.values(fileGroups).every(group => 
          Array.isArray(group) ? group.length === 0 : true
        ) && (
          <div className="empty-folder">
            <p>Esta pasta está vazia</p>
          </div>
        )}

      </main>
      {showCreateFolderModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Criar Nova Pasta</h3>
            <p>
              {currentFolderContent.folder 
                ? `Dentro de: ${currentFolderContent.folder.nome}`
                : 'Na raiz do seu drive'}
            </p>
            
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta"
              autoFocus
            />
            
            <div className="modal-actions">
              <button 
                onClick={() => setShowCreateFolderModal(false)}
                className="cancel-btn"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={loadingStates.folders}
                className="confirm-btn"
              >
                {loadingStates.folders ? 'Criando...' : 'Criar Pasta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;