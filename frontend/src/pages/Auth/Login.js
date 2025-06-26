import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTermo } from '../../context/TermoContext'; // Adicione esta importação
import { useNavigate, Link } from 'react-router-dom';
import Verify2FA from './Verify2FA';
import TermoUsoModal from '../../components/TermoUsoModal'; // Importe o modal

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const { login, verifyLogin, logout } = useAuth();
  const { termos, precisaAceitarTermos, aceitarTermos, recusarTermos } = useTermo(); // Use o hook
  const [showTermoModal, setShowTermoModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Mostra o modal se o usuário precisa aceitar os termos (após verificação 2FA)
    if (step === 3 && precisaAceitarTermos()) {
      setShowTermoModal(true);
    }
  }, [step, precisaAceitarTermos]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro durante o login');
    }
  };

  const handleVerifySubmit = async (code) => {
    try {
      setError('');
      const result = await verifyLogin(email, code);
      
      if (result?.success) {
        // Verifica se precisa aceitar termos antes de navegar para home
        if (precisaAceitarTermos()) {
          setStep(3); // Vai mostrar o modal via useEffect
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.message);
      throw err;
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
        await logout(); // Desloga o usuário
        navigate('/login', { state: { termosRecusados: true } });
      }
    } catch (err) {
      setError('Erro ao processar sua recusa. Tente novamente.');
    }
  };

  return (
    <>
      {step === 1 ? (
        <div className="auth-container">
          <h2>Login</h2>
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleLoginSubmit}>
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
            
            <div className="auth-footer">
              <span>Não tem uma conta? </span>
              <Link to="/register">Registre-se</Link>
            </div>
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
        // Passo 3 - Aguardando verificação de termos
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
          isMandatory={true} // Torna obrigatório para login
        />
      )}
    </>
  );
};

export default Login;