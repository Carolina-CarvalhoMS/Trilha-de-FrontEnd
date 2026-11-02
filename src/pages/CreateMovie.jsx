import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { Header } from '../components/Header';

export function CreateMovie() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [director, setDirector] = useState('');
  const [genre, setGenre] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [rating, setRating] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  function normalizeTitle(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  async function handleCreateMovie(e) {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    const yearNum = Number(releaseYear);
    const currentYear = new Date().getFullYear();

    // Validação de ano
    if (isNaN(yearNum) || yearNum < 1888 || yearNum > currentYear) {
      setFeedback({
        type: 'error',
        message: `O ano de lançamento deve ser entre 1888 e ${currentYear}.`,
      });
      return;
    }

    const normalizedNewTitle = normalizeTitle(title);
    if (!normalizedNewTitle) {
      setFeedback({ type: 'error', message: 'O título do filme é obrigatório.' });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Busca os filmes existentes da API e do LocalStorage
      let apiMovies = [];
      try {
        const response = await api.get('/movies');
        const data = response.data?.data || response.data?.movies || response.data || [];
        if (Array.isArray(data)) apiMovies = data;
      } catch (err) {
        console.warn('Não foi possível buscar filmes da API para checagem de duplicatas.', err);
      }

      const localMovies = JSON.parse(localStorage.getItem('custom_movies') || '[]');
      const deletedMovies = JSON.parse(localStorage.getItem('deleted_movies') || '[]');

      // Função para verificar se o filme está na lista de excluídos
      const isDeleted = (m) => {
        const mId = String(m.id || m._id);
        const mTitle = normalizeTitle(m.title || m.name);
        return deletedMovies.some(
          (d) => (d.id && String(d.id) === mId) || (d.title && d.title === mTitle)
        );
      };

      // Filtra apenas os filmes que NÃO foram excluídos
      const activeApiMovies = apiMovies.filter((m) => !isDeleted(m));
      const activeLocalMovies = localMovies.filter((m) => !isDeleted(m));
      const allActiveMovies = [...activeApiMovies, ...activeLocalMovies];

      // 2. Verifica se o título já existe entre os filmes ativos
      const isDuplicate = allActiveMovies.some((m) => {
        const existingTitle = normalizeTitle(m.title || m.name);
        return existingTitle === normalizedNewTitle;
      });

      if (isDuplicate) {
        setFeedback({
          type: 'error',
          message: 'Já existe um filme cadastrado com este título no catálogo.',
        });
        setSubmitting(false);
        return;
      }

      // 3. Prepara o payload para envio
      const payload = {
        title: title.trim(),
        director: director.trim(),
        genre: genre.trim(),
        releaseYear: yearNum,
        release_year: yearNum,
        rating: Number(rating.toString().replace(',', '.')),
        description: description.trim() || '',
      };

      let createdMovie = { ...payload, id: `custom-${Date.now()}` };

      try {
        const response = await api.post('/movies', payload);
        if (response.data?.id || response.data?._id) {
          createdMovie = { ...createdMovie, ...response.data };
        }
      } catch (apiErr) {
        console.warn('API não persistiu, salvando localmente.', apiErr);
      }

      // Persiste no localStorage de filmes customizados
      localStorage.setItem('custom_movies', JSON.stringify([createdMovie, ...activeLocalMovies]));

      // Se o filme estava na lista de excluídos anteriormente, remove-o de lá
      const updatedDeletedMovies = deletedMovies.filter(
        (d) => d.title !== normalizedNewTitle && String(d.id) !== String(createdMovie.id)
      );
      localStorage.setItem('deleted_movies', JSON.stringify(updatedDeletedMovies));

      setFeedback({ type: 'success', message: 'Filme cadastrado com sucesso! Redirecionando...' });

      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Erro ao cadastrar filme.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Header />

      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '20px',
          color: 'var(--primary)',
          fontWeight: '600',
        }}
      >
        <ArrowLeft size={16} /> Voltar ao Catálogo
      </Link>

      <section className="card-container">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Plus size={20} /> Cadastrar Novo Filme
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

        <form onSubmit={handleCreateMovie} style={{ display: 'grid', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <label>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Título</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>

            <label>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Diretor</span>
              <input type="text" value={director} onChange={(e) => setDirector(e.target.value)} required />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <label>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Gênero</span>
              <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} required />
            </label>

            <label>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Ano</span>
              <input
                type="number"
                min="1888"
                max={new Date().getFullYear()}
                placeholder="Ex: 2024"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                required
              />
            </label>

            <label>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Nota</span>
              <input type="number" step="0.1" min="0" max="10" value={rating} onChange={(e) => setRating(e.target.value)} required />
            </label>
          </div>

          <label>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Sinopse</span>
            <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifySelf: 'start' }}>
            {submitting ? 'A cadastrar...' : 'Cadastrar Filme'}
          </button>
        </form>
      </section>
    </div>
  );
}