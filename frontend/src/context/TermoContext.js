// TermoContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import termoApi from '../api/termo';
import { useAuth } from './AuthContext';

const TermoContext = createContext();

export const TermoProvider = ({ children }) => {
  const [termos, setTermos] = useState(null);
  const [aceitacao, setAceitacao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Carrega os termos e a situação de aceitação do usuário
  const carregarTermos = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Carrega os termos atuais
      const termosResponse = await termoApi.getCurrentTerms(user.jwt_token);
      if (!termosResponse.success) throw new Error(termosResponse.error.message);

      // Verifica se o usuário já aceitou
      const aceitacaoResponse = await termoApi.checkUserTermsAcceptance(user.jwt_token);
      if (!aceitacaoResponse.success) throw new Error(aceitacaoResponse.error.message);

      setTermos(termosResponse.data);
      setAceitacao(aceitacaoResponse.data);
    } catch (err) {
      console.error('Erro ao carregar termos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.jwt_token]);

  // Efeito para carregar os termos quando o contexto é montado ou quando o usuário muda
  useEffect(() => {
    carregarTermos();
  }, [carregarTermos]);

  // Função para aceitar os termos
  const aceitarTermos = async () => {
    try {
      setLoading(true);
      const response = await termoApi.acceptTerms(user.jwt_token);
      
      if (!response.success) {
        throw new Error(response.error.message);
      }

      // Atualiza o estado local
      setAceitacao({
        termos_aceitos: true,
        versao_aceita: termos.versao_termos,
        data_aceite: new Date().toISOString(),
        conta_exclusao_solicitada: false,
        data_exclusao: null
      });

      return { success: true };
    } catch (err) {
      console.error('Erro ao aceitar termos:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Função para recusar os termos
  const recusarTermos = async () => {
    try {
      setLoading(true);
      const response = await termoApi.rejectTerms(user.jwt_token);
      
      if (!response.success) {
        throw new Error(response.error.message);
      }

      // Atualiza o estado local
      setAceitacao({
        termos_aceitos: false,
        versao_aceita: null,
        data_aceite: null,
        conta_exclusao_solicitada: true,
        data_exclusao: response.data.data_exclusao
      });

      return { success: true };
    } catch (err) {
      console.error('Erro ao recusar termos:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Verifica se o usuário precisa aceitar os termos
  const precisaAceitarTermos = () => {
    if (!isAuthenticated || !aceitacao || !termos) return false;
    return !aceitacao.termos_aceitos || aceitacao.versao_aceita !== termos.versao_termos;
  };

  // Força uma recarga dos termos
  const recarregarTermos = async () => {
    await carregarTermos();
  };

  return (
    <TermoContext.Provider
      value={{
        termos,
        aceitacao,
        loading,
        error,
        precisaAceitarTermos,
        aceitarTermos,
        recusarTermos,
        recarregarTermos
      }}
    >
      {children}
    </TermoContext.Provider>
  );
};

export const useTermo = () => useContext(TermoContext);