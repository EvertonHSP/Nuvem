import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTermo } from '../../context/TermoContext';
import { useNavigate } from 'react-router-dom';
import Verify2FA from './Verify2FA';
import TermoUsoModal from '../../components/TermoUsoModal'; // Componente que você precisará criar

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const { register, verifyRegister } = useAuth();
  const { termos, aceitacao, precisaAceitarTermos, aceitarTermos, recusarTermos } = useTermo();
  const [showTermoModal, setShowTermoModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Se o usuário já estiver autenticado e precisar aceitar termos, mostra o modal
    if (step === 3 && precisaAceitarTermos()) {
      setShowTermoModal(true);
    }
  }, [step, precisaAceitarTermos]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await register(email, password, nome);
      console.log('Resposta do registro:', response);
      if (response === 201) {
        setStep(2); 
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ocorreu um erro durante o registro');
    }
  };

  const handleVerifySubmit = async (code) => {
    try {
      await verifyRegister(email, code);
      // Após verificação bem-sucedida, avança para o passo de aceitação de termos
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido');
    }
  };

  const handleAceitarTermos = async () => {
    try {
      const response = await aceitarTermos();
      if (response.success) {
        setShowTermoModal(false);
        navigate('/'); // Redireciona para a home após aceitar
      }
    } catch (err) {
      setError('Erro ao aceitar termos. Tente novamente.');
    }
  };

  const handleRecusarTermos = async () => {
    try {
      const response = await recusarTermos();
      if (response.success) {
        // Desloga o usuário e redireciona para a página inicial
        navigate('/logout');
      }
    } catch (err) {
      setError('Erro ao processar sua recusa. Tente novamente.');
    }
  };

  return (
    <>
      {step === 1 ? (
        <div className="auth-container">
          <h2>Criar Conta</h2>
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label>Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit">Continuar</button>
          </form>
        </div>
      ) : step === 2 ? (
        <Verify2FA 
          email={email}
          onSubmit={handleVerifySubmit}
          onBack={() => setStep(1)}
          error={error}
        />
      ) : (
        // Passo 3 - Aguardando verificação de termos (o modal será mostrado pelo useEffect)
        <div className="loading-container">
          <p>Carregando termos de uso...</p>
        </div>
      )}

      {/* Modal de Termos de Uso */}
      {showTermoModal && termos && (
        <TermoUsoModal
          conteudo={termos.conteudo_termos}
          versao={termos.versao_termos}
          onAccept={handleAceitarTermos}
          onReject={handleRecusarTermos}
        />
      )}
    </>
  );
};

export default Register;