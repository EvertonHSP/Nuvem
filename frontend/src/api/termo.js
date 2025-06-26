// termo.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://localhost:5000/api';

const getCurrentTerms = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/termos`, {
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
    let errorMessage = 'Erro ao obter termos de uso';
    let errorCode = 'TERMS_FETCH_ERROR';
    
    if (error.response) {
      if (error.response.status === 401) {
        errorCode = 'UNAUTHORIZED';
        errorMessage = 'Sessão expirada ou inválida';
      } else if (error.response.status === 404) {
        errorCode = 'TERMS_NOT_FOUND';
        errorMessage = 'Termos de uso não encontrados';
      } else if (error.response.data?.error) {
        errorMessage = error.response.data.error;
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

const checkUserTermsAcceptance = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/termos/verificar`, {
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
    let errorMessage = 'Erro ao verificar aceitação dos termos';
    let errorCode = 'TERMS_CHECK_ERROR';
    
    if (error.response) {
      if (error.response.status === 401) {
        errorCode = 'UNAUTHORIZED';
        errorMessage = 'Sessão expirada ou inválida';
      } else if (error.response.data?.error) {
        errorMessage = error.response.data.error;
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

const acceptTerms = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/termos`,
      { aceito: true },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
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
    let errorMessage = 'Erro ao aceitar termos';
    let errorCode = 'TERMS_ACCEPT_ERROR';
    
    if (error.response) {
      if (error.response.status === 401) {
        errorCode = 'UNAUTHORIZED';
        errorMessage = 'Sessão expirada ou inválida';
      } else if (error.response.data?.error) {
        errorMessage = error.response.data.error;
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

const rejectTerms = async (token) => {
  try {
    const response = await axios.post(
      `${API_URL}/termos`,
      { aceito: false },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
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
    let errorMessage = 'Erro ao recusar termos';
    let errorCode = 'TERMS_REJECT_ERROR';
    
    if (error.response) {
      if (error.response.status === 401) {
        errorCode = 'UNAUTHORIZED';
        errorMessage = 'Sessão expirada ou inválida';
      } else if (error.response.data?.error) {
        errorMessage = error.response.data.error;
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

export default {
  getCurrentTerms,
  checkUserTermsAcceptance,
  acceptTerms,
  rejectTerms
};