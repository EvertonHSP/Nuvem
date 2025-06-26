import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://localhost:5000/api';

const listFolderContent = async (folderId = null, token) => {
  try {
    const url = folderId 
      ? `${API_URL}/folders/${folderId}`
      : `${API_URL}/folders`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      withCredentials: true
    });

    return {
      success: true,
      data: response.data,
      error: null
    };
  } catch (error) {
    let errorMessage = 'Erro ao listar conteúdo da pasta';
    let errorCode = 'FOLDER_CONTENT_ERROR';
    
    if (error.response) {
      if (error.response.status === 401) {
        errorCode = 'UNAUTHORIZED';
        errorMessage = 'Sessão expirada ou inválida';
      } else if (error.response.status === 404) {
        errorCode = 'FOLDER_NOT_FOUND';
        errorMessage = 'Pasta não encontrada';
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      }
    }

    return {
      success: false,
      data: null,
      error: {
        message: errorMessage,
        code: errorCode,
        details: error.response?.data || null
      }
    };
  }
};


const createFolder = async (folderName, parentFolderId = null, token) => {
  try {
    const response = await axios.post(
      `${API_URL}/pastas/create`,
      {
        nome: folderName,
        pasta_pai_id: parentFolderId || null
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        withCredentials: true
      }
    );

    return {
      success: true,
      data: response.data,
      error: null
    };
  } catch (error) {
    let errorMessage = 'Erro ao criar pasta';
    let errorCode = 'FOLDER_CREATE_ERROR';
    
    if (error.response) {
      if (error.response.status === 400) {
        errorCode = 'INVALID_NAME';
        errorMessage = 'Nome da pasta inválido';
      } else if (error.response.status === 401) {
        errorCode = 'UNAUTHORIZED';
        errorMessage = 'Sessão expirada ou inválida';
      } else if (error.response.status === 404) {
        errorCode = 'PARENT_NOT_FOUND';
        errorMessage = 'Pasta pai não encontrada';
      } else if (error.response.status === 409) {
        errorCode = 'FOLDER_EXISTS';
        errorMessage = 'Já existe uma pasta com este nome';
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      }
    }

    return {
      success: false,
      data: null,
      error: {
        message: errorMessage,
        code: errorCode,
        details: error.response?.data || null
      }
    };
  }
};



const uploadFile = async (file, isPublic = false, tags = [], description = '', folderId = null, token) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_public', isPublic);
    
    if (tags && tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }
    
    if (description) {
      formData.append('description', description);
    }
    
    if (folderId) {
      formData.append('folder_id', folderId);
    }

    const response = await axios.post(`${API_URL}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest'  // Adicione esta linha
      },
      withCredentials: true  // Importante para cookies/sessões
    });

    return {
      success: true,
      data: response.data,
      error: null
    };
  } catch (error) {
    // Tratamento padrão de erros (similar ao auth.js)
    let errorMessage = 'Erro ao enviar arquivo';
    let errorCode = 'UPLOAD_ERROR';
    
    if (error.response) {
      if (error.response.status === 401) {
        errorCode = 'UNAUTHORIZED';
        errorMessage = 'Sessão expirada ou inválida';
      } else if (error.response.status === 413) {
        errorCode = 'FILE_TOO_LARGE';
        errorMessage = 'Arquivo excede o tamanho máximo permitido';
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      }
    }

    return {
      success: false,
      data: null,
      error: {
        message: errorMessage,
        code: errorCode,
        details: error.response?.data || null
      }
    };
  }
};


const downloadFile = async (fileId, token) => {
  try {
    const response = await axios.get(`${API_URL}/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'blob'
    });

    return {
      success: true,
      data: response.data,
      headers: response.headers,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: {
        message: 'Erro ao baixar arquivo',
        code: 'DOWNLOAD_ERROR',
        details: error.response?.data || null
      }
    };
  }
};

const deleteFile = async (fileId, token) => {
  try {
    const response = await axios.delete(`${API_URL}/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return {
      success: true,
      data: response.data,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: {
        message: 'Erro ao excluir arquivo',
        code: 'DELETE_ERROR',
        details: error.response?.data || null
      }
    };
  }
};

export default {
  uploadFile,
  downloadFile,
  deleteFile,
  listFolderContent,
  createFolder
};