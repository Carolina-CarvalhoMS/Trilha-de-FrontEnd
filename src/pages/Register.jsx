import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { Header } from '../components/Header'; // 1. Importar o Header

export function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      await api.post('/auth/register', { name, email, password });
      
      setFeedback({
        type: 'success',
        message: 'Cadastro realizado com sucesso! A redirecionar para a página de login...',
      });

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Erro ao realizar o cadastro. Tente novamente.';
      setFeedback({ type: 'error', message: msg });
      setLoading(false);
    }
  }

  return (
    <div>
      <Header /> {/* 2. Adicionar o Header no topo */}
      
      <div style={{ maxWidth: '400px', margin: '20px auto', padding: '0 16px' }}>
        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '20px',
            color: 'var(--primary)',
            fontWeight: '600',
          }}
        >
          <ArrowLeft size={16} /> Voltar para o Login
        </Link>

        <section className="card-container">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <UserPlus size={22} /> Criar Conta
          </h2>

          {feedback.message && (
            <div
              style={{
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
                backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: feedback.type === 'success' ? '#166534' : '#991b1b',
                fontSize: '0.9rem',
              }}
            >
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'grid', gap: '14px' }}>
            <label>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Nome</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'A cadastrar...' : 'Cadastrar'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}