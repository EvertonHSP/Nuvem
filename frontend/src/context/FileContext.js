import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import fileApi from '../api/file';
import { useAuth } from './AuthContext';
import db from '../database/db';

const FileContext = createContext();

export const FileProvider = ({ children }) => {
  // Estados principais
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 10737418240 }); // 10GB padrão
  const [loadingStates, setLoadingStates] = useState({
    files: false,
    upload: false,
    folders: false,
    delete: false
  });
  const [errors, setErrors] = useState({
    files: null,
    upload: null,
    folders: null,
    delete: null
  });

  // Novos estados para o gerenciamento de pastas
  const [currentFolderContent, setCurrentFolderContent] = useState({
    folder: null,
    subfolders: [],
    files: [],
    path: []
  });
  const [folderLoading, setFolderLoading] = useState(false);
  const [folderError, setFolderError] = useState(null);

  const { user, isOffline } = useAuth();

  // Função para registrar logs de auditoria
  const registerAuditLog = useCallback((action, metadata = {}) => {
    console.log('[Audit Log]', {
      timestamp: new Date().toISOString(),
      userId: user?.id,
      action,
      ip: window.REMOTE_IP || 'localhost',
      ...metadata
    });
  }, [user]);

  // Atualiza o uso de armazenamento
  const updateStorageUsage = useCallback(async () => {
    console.group('[FileContext] updateStorageUsage');
    try {
      if (isOffline) {
        const localUsed = files.reduce((sum, file) => sum + file.tamanho, 0);
        setStorageUsage(prev => ({ ...prev, used: localUsed }));
        console.log('Modo offline - usando cálculo local:', localUsed);
      } else {
        const serverData = await fileApi.getStorageUsage(user.jwt_token);
        setStorageUsage({
          used: serverData.used,
          quota: serverData.quota || storageUsage.quota
        });
        console.log('Dados do servidor:', serverData);
      }
    } catch (error) {
      console.error('Erro ao atualizar storage:', error);
    } finally {
      console.groupEnd();
    }
  }, [files, isOffline, user?.jwt_token, storageUsage.quota]);

  // Verifica quota antes de operações
  const checkStorageQuota = useCallback(async (fileSize) => {
    console.group('[FileContext] checkStorageQuota');
    try {
      await updateStorageUsage();
      const { used, quota } = storageUsage;
      const spaceNeeded = used + fileSize;

      console.log(`Verificando: ${spaceNeeded} / ${quota}`);

      if (spaceNeeded > quota) {
        const error = new Error(`Quota excedida. Disponível: ${formatBytes(quota - used)}`);
        error.code = 'QUOTA_EXCEEDED';
        error.available = quota - used;
        throw error;
      }
    } finally {
      console.groupEnd();
    }
  }, [storageUsage, updateStorageUsage]);

  // Formata bytes para leitura humana
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Carrega arquivos do usuário (manter a função original)
  const fetchUserFiles = useCallback(async (folderId = null) => {
    console.group('[FileContext] fetchUserFiles');
    
    if (!user?.jwt_token) {
      console.warn('Usuário não autenticado');
      console.groupEnd();
      return;
    }

    setLoadingStates(prev => ({ ...prev, files: true }));
    setErrors(prev => ({ ...prev, files: null }));

    try {
      console.log(`Buscando arquivos para a pasta ${folderId || 'raiz'}`);
      const response = await fileApi.getFiles(user.jwt_token, folderId);
      
      setFiles(response.data);
      await updateStorageUsage();
      
      registerAuditLog('LIST_FILES', { folderId, count: response.data.length });
    } catch (error) {
      console.error('Erro ao buscar arquivos:', error);
      setErrors(prev => ({ ...prev, files: error.message }));
      
      if (isOffline) {
        console.log('Tentando carregar do cache offline...');
        const cachedFiles = await db.files.toArray();
        setFiles(cachedFiles);
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, files: false }));
      console.groupEnd();
    }
  }, [user, isOffline, updateStorageUsage, registerAuditLog]);

  // Nova função para carregar conteúdo de pasta
  const loadFolderContent = useCallback(async (folderId = null) => {
  console.group('[FileContext] loadFolderContent');
  console.log('Folder ID:', folderId);
  
  setFolderLoading(true);
  setFolderError(null);
  
  try {
    const response = await fileApi.listFolderContent(folderId, user.jwt_token);
    console.log('API Response:', response);
    
    if (!response.success) {
      throw new Error(response.error.message || 'Erro ao carregar pasta');
    }

    // Log detalhado dos dados recebidos
    console.log('Dados da pasta atual:', response.data.pasta_atual);
    console.log('Subpastas:', response.data.pastas);
    console.log('Arquivos:', response.data.arquivos);

    let newPath = [];
    if (folderId) {
      newPath = [
        { id: null, name: 'Raiz' },
        { id: folderId, name: response.data.pasta_atual.nome }
      ];
    } else {
      newPath = [{ id: null, name: 'Raiz' }];
    }

    setCurrentFolderContent({
      folder: response.data.pasta_atual,
      subfolders: response.data.pastas,
      files: response.data.arquivos,
      path: newPath
    });

    console.log('Estado atualizado:', {
      folder: response.data.pasta_atual,
      subfolders: response.data.pastas,
      files: response.data.arquivos,
      path: newPath
    });

    setFiles(response.data.arquivos);
    setCurrentFolder(folderId);

  } catch (err) {
    console.error('Erro ao carregar pasta:', err);
    setFolderError(err.message);
  } finally {
    setFolderLoading(false);
    console.groupEnd();
  }
}, [user]);


  const createFolder = async (folderName, parentFolderId = null) => {
    console.group('[FileContext] createFolder');
    setLoadingStates(prev => ({ ...prev, folders: true }));
    setFolderError(null);

    try {
      // Validação básica no client-side
      if (!folderName || folderName.trim().length === 0) {
        throw new Error('Nome da pasta não pode ser vazio');
      }

      console.log(`Criando pasta: ${folderName} dentro de ${parentFolderId || 'raiz'}`);
      
      // Chamada para a API via file.js
      const result = await fileApi.createFolder(
        folderName,
        parentFolderId,
        user.jwt_token
      );

      if (!result.success) {
        throw result.error;
      }

      console.log('Pasta criada com sucesso:', result.data);

      // Atualiza o estado das pastas
      if (parentFolderId === currentFolder || parentFolderId === currentFolderContent.folder?.id) {
        // Se criada na pasta atual, atualiza o conteúdo
        setCurrentFolderContent(prev => ({
          ...prev,
          subfolders: [...prev.subfolders, result.data.pasta]
        }));
      }

      // Atualiza a lista completa de pastas
      setFolders(prev => [...prev, result.data.pasta]);

      // Registro de auditoria
      registerAuditLog('FOLDER_CREATE', {
        folderId: result.data.pasta.id,
        parentId: parentFolderId,
        folderName: folderName
      });

      return {
        success: true,
        data: result.data,
        error: null
      };

    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      setFolderError(error.message);
      
      return {
        success: false,
        data: null,
        error: {
          message: error.message,
          code: error.code || 'FOLDER_CREATE_ERROR',
          details: error.details || null
        }
      };
    } finally {
      setLoadingStates(prev => ({ ...prev, folders: false }));
      console.groupEnd();
    }
  };


  // Upload de arquivo
  const uploadFile = async (fileData) => {
    console.group('[FileContext] uploadFile');
    setLoadingStates(prev => ({ ...prev, upload: true }));
    setErrors(prev => ({ ...prev, upload: null }));

    try {
      //await checkStorageQuota(fileData.file.size);
      const result = await fileApi.uploadFile(
        fileData.file,
        fileData.isPublic || false,
        fileData.tags || [],
        fileData.description || '',
        fileData.folderId || null,
        user.jwt_token
      );

      if (!result.success) throw result.error;

      setFiles(prev => [...prev, result.data]);
      await updateStorageUsage();
      
      registerAuditLog('UPLOAD', {
        fileId: result.data.id,
        size: fileData.file.size,
        isPublic: fileData.isPublic
      });

      return result;
    } catch (error) {
      console.error('Erro no upload:', error);
      setErrors(prev => ({ ...prev, upload: error.message }));
      return { success: false, error };
    } finally {
      setLoadingStates(prev => ({ ...prev, upload: false }));
      console.groupEnd();
    }
  };


// Download de arquivo
  const downloadFile = async (fileId) => {
    console.group('[FileContext] downloadFile');
    try {
      const result = await fileApi.downloadFile(fileId, user.jwt_token);
      registerAuditLog('DOWNLOAD', { fileId });
      return result;
    } catch (error) {
      console.error('Erro no download:', error);
      return { success: false, error };
    } finally {
      console.groupEnd();
    }
  };

  // Delete de arquivo
  const deleteFile = async (fileId) => {
    console.group('[FileContext] deleteFile');
    setLoadingStates(prev => ({ ...prev, delete: true }));
    setErrors(prev => ({ ...prev, delete: null }));

    try {
      const fileToDelete = files.find(f => f.id === fileId);
      if (!fileToDelete) throw new Error('Arquivo não encontrado');

      const result = await fileApi.deleteFile(fileId, user.jwt_token);
      if (!result.success) throw result.error;

      // Atualiza ambos os sistemas de estado
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setCurrentFolderContent(prev => ({
        ...prev,
        files: prev.files.filter(f => f.id !== fileId)
      }));
      
      await updateStorageUsage();
      registerAuditLog('DELETE', {
        fileId,
        fileName: fileToDelete.nome_original,
        size: fileToDelete.tamanho
      });

      return result;
    } catch (error) {
      console.error('Erro ao deletar:', error);
      setErrors(prev => ({ ...prev, delete: error.message }));
      return { success: false, error };
    } finally {
      setLoadingStates(prev => ({ ...prev, delete: false }));
      console.groupEnd();
    }
  };

  // Efeito inicial - carrega conteúdo da raiz
  useEffect(() => {
    if (user) {
      loadFolderContent();
    }
  }, [user, loadFolderContent]);

  return (
    <FileContext.Provider
      value={{
        // Estado tradicional (mantido para compatibilidade)
        files,
        folders,
        currentFolder,
        storageUsage,
        loadingStates,
        errors,
        formatBytes,
        currentFolderContent,
        folderLoading,
        folderError,
        fetchUserFiles,
        uploadFile,
        downloadFile,
        deleteFile,
        setCurrentFolder,
        updateStorageUsage,
        loadFolderContent,
        createFolder,
        refreshFileList: fetchUserFiles
      }}
    >
      {children}
    </FileContext.Provider>
  );
};

export const useFiles = () => useContext(FileContext);