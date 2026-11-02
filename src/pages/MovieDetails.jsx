import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Star, Edit, Trash2, Save, X } from 'lucide-react';
import { api } from '../services/api';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

export function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { signed } = useAuth();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados do formulário de edição
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [director, setDirector] = useState('');
  const [genre, setGenre] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [rating, setRating] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Normaliza o título para ignorar maiúsculas, acentos e caracteres especiais na comparação
  function normalizeTitle(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  async function loadMovie() {
    try {
      setLoading(true);
      setError(null);

      let foundMovie = null;

      // 1. Tenta buscar o filme na API
      try {
        const response = await api.get(`/movies/${id}`);
        foundMovie = response.data?.data || response.data?.movie || response.data;
      } catch (err) {
        console.warn('Filme não encontrado na API, a buscar no localStorage...');
      }

      // 2. Se não encontrar na API, busca no localStorage
      if (!foundMovie || (!foundMovie.title && !foundMovie.name)) {
        const localMovies = JSON.parse(localStorage.getItem('custom_movies') || '[]');
        foundMovie = localMovies.find((m) => String(m.id || m._id) === String(id));
      }

      if (foundMovie && (foundMovie.title || foundMovie.name)) {
        setMovie(foundMovie);
        setTitle(foundMovie.title || foundMovie.name || '');
        setDirector(foundMovie.director || '');
        setGenre(foundMovie.genre || '');
        setReleaseYear(foundMovie.releaseYear || foundMovie.release_year || '');
        setRating(foundMovie.rating ?? '');
        setDescription(foundMovie.description || foundMovie.synopsis || '');
      } else {
        setError('Filme não encontrado.');
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes do filme:', err);
      setError('Erro ao carregar detalhes do filme.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMovie();
  }, [id]);

  async function handleUpdate(e) {
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

    // Validação de duplicidade de título
    const normalizedNewTitle = normalizeTitle(title);
    if (!normalizedNewTitle) {
      setFeedback({ type: 'error', message: 'O título do filme é obrigatório.' });
      return;
    }

    let allMovies = [];
    try {
      const apiRes = await api.get('/movies');
      const apiData = apiRes.data?.data || apiRes.data || [];
      if (Array.isArray(apiData)) allMovies = [...apiData];
    } catch (err) {
      console.warn('Não foi possível buscar filmes da API para checagem de duplicatas.', err);
    }

    const localMovies = JSON.parse(localStorage.getItem('custom_movies') || '[]');
    allMovies = [...allMovies, ...localMovies];

    // Verifica se existe OUTRO filme (com ID diferente) com o mesmo título
    const isDuplicate = allMovies.some((m) => {
      const isSameMovie = String(m.id || m._id) === String(id);
      if (isSameMovie) return false;

      const existingTitle = normalizeTitle(m.title || m.name);
      return existingTitle === normalizedNewTitle;
    });

    if (isDuplicate) {
      setFeedback({
        type: 'error',
        message: 'Já existe outro filme cadastrado com este título no catálogo.',
      });
      return;
    }

    setSubmitting(true);

    const updatedData = {
      ...movie,
      title: title.trim(),
      director: director.trim(),
      genre: genre.trim(),
      releaseYear: yearNum,
      release_year: yearNum,
      rating: Number(rating.toString().replace(',', '.')),
      description: description.trim(),
    };

    try {
      // Tenta atualizar na API
      try {
        await api.put(`/movies/${id}`, updatedData);
      } catch (apiErr) {
        console.warn('API não aceitou PUT, atualizando apenas localmente.', apiErr);
      }

      // Atualiza no localStorage
      const updatedLocalList = localMovies.map((m) =>
        String(m.id || m._id) === String(id) ? { ...m, ...updatedData } : m
      );
      
      // Se era um filme original da API e não estava no localStorage, insere a alteração no localStorage
      const existsInLocal = localMovies.some((m) => String(m.id || m._id) === String(id));
      if (!existsInLocal) {
        updatedLocalList.unshift(updatedData);
      }

      localStorage.setItem('custom_movies', JSON.stringify(updatedLocalList));

      setMovie(updatedData);
      setIsEditing(false);
      setFeedback({ type: 'success', message: 'Filme atualizado com sucesso!' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao atualizar filme.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Tem certeza que deseja excluir este filme?')) return;

    try {
      try {
        await api.delete(`/movies/${id}`);
      } catch (apiErr) {
        console.warn('API não aceitou DELETE, removendo apenas localmente.', apiErr);
      }

      // 1. Remove da lista de filmes locais
      const localMovies = JSON.parse(localStorage.getItem('custom_movies') || '[]');
      const updatedLocal = localMovies.filter((m) => String(m.id || m._id) !== String(id));
      localStorage.setItem('custom_movies', JSON.stringify(updatedLocal));

      // 2. Registra o filme na lista de excluídos para a Home ignorar no GET da API
      const deletedMovies = JSON.parse(localStorage.getItem('deleted_movies') || '[]');
      const movieTitleNormalized = normalizeTitle(movie?.title || movie?.name);

      const newDeletedItem = {
        id: String(id),
        title: movieTitleNormalized,
      };

      localStorage.setItem('deleted_movies', JSON.stringify([...deletedMovies, newDeletedItem]));

      navigate('/');
    } catch (err) {
      alert('Erro ao excluir filme.');
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

      {loading && <p style={{ textAlign: 'center', padding: '20px' }}>A carregar detalhes do filme...</p>}

      {error && (
        <div style={{ padding: '20px', color: 'var(--danger)', textAlign: 'center' }}>
          <h2>{error}</h2>
        </div>
      )}

      {!loading && !error && movie && (
        <section className="card-container">
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

          {!isEditing ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div className="badge-group" style={{ marginBottom: '12px' }}>
                    <span className="badge badge-genre">{movie.genre || 'Gênero'}</span>
                    <span className="badge badge-rating" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={14} fill="#b45309" color="#b45309" /> {movie.rating ?? '0'}
                    </span>
                  </div>
                  <h1 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{movie.title || movie.name}</h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '16px' }}>
                    {movie.releaseYear || movie.release_year || 'Ano N/A'} | Diretor: {movie.director || 'Não informado'}
                  </p>
                </div>

                {signed && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn btn-outline"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Edit size={16} /> Editar
                    </button>
                    <button
                      onClick={handleDelete}
                      className="btn"
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fca5a5',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Trash2 size={16} /> Excluir
                    </button>
                  </div>
                )}
              </div>

              <hr style={{ margin: '20px 0', borderColor: 'var(--border-color, #e5e7eb)' }} />

              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Sinopse</h3>
                <p style={{ lineHeight: '1.6', color: 'var(--text-main, #374151)' }}>
                  {movie.description || movie.synopsis || 'Sem sinopse cadastrada.'}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '14px' }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Editar Filme</h2>

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

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={16} /> {submitting ? 'A salvar...' : 'Salvar Alterações'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <X size={16} /> Cancelar
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}