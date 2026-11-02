import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Plus, Film } from 'lucide-react';
import { api } from '../services/api';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

export function Home() {
  const { signed } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function normalizeTitle(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function extractMoviesArray(responseData) {
    if (Array.isArray(responseData)) return responseData;
    if (Array.isArray(responseData?.data)) return responseData.data;
    if (Array.isArray(responseData?.movies)) return responseData.movies;
    if (Array.isArray(responseData?.result)) return responseData.result;
    return [];
  }

  async function fetchMovies() {
    try {
      setLoading(true);
      setError(null);

      let apiMovies = [];
      try {
        const response = await api.get('/movies');
        apiMovies = extractMoviesArray(response.data);
      } catch (err) {
        console.error('Erro ao buscar API:', err);
      }

      const savedLocalMovies = JSON.parse(localStorage.getItem('custom_movies') || '[]');
      const deletedMovies = JSON.parse(localStorage.getItem('deleted_movies') || '[]');

      // Função que checa se o filme está marcado como excluído
      const isDeleted = (m) => {
        const mId = String(m.id || m._id);
        const mTitle = normalizeTitle(m.title || m.name);
        return deletedMovies.some(
          (d) => (d.id && String(d.id) === mId) || (d.title && d.title === mTitle)
        );
      };

      // 1. Pega os filmes do localStorage que não foram excluídos
      const mergedMovies = savedLocalMovies.filter((m) => !isDeleted(m));

      // 2. Adiciona os filmes da API apenas se não foram excluídos e não estão duplicados
      apiMovies.forEach((apiMovie) => {
        if (isDeleted(apiMovie)) return;

        const exists = mergedMovies.some(
          (m) =>
            String(m.id || m._id) === String(apiMovie.id || apiMovie._id) ||
            normalizeTitle(m.title || m.name) === normalizeTitle(apiMovie.title || apiMovie.name)
        );

        if (!exists) {
          mergedMovies.push(apiMovie);
        }
      });

      setMovies(mergedMovies);
    } catch (err) {
      console.error('Erro ao carregar catálogo:', err);
      setError('Erro ao carregar o catálogo de filmes. Verifique se a API está em execução.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMovies();
  }, []);

  return (
    <div>
      <Header />

      {signed && (
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            to="/cadastrar-filme"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> Cadastrar Novo Filme
          </Link>
        </div>
      )}

      <section>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Film size={22} /> Catálogo de Filmes
        </h2>

        {loading && <p style={{ textAlign: 'center', padding: '20px' }}>A carregar catálogo...</p>}
        {error && <p style={{ color: 'var(--danger)', textAlign: 'center', padding: '20px' }}>{error}</p>}

        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {movies.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum filme cadastrado no momento.</p>
            ) : (
              movies.map((movie, index) => (
                <article
                  key={movie.id || movie._id || index}
                  className="card-container"
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                >
                  <div>
                    <div className="badge-group" style={{ marginBottom: '8px' }}>
                      <span className="badge badge-genre">{movie.genre || 'Gênero'}</span>
                      <span className="badge badge-rating" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={14} fill="#b45309" color="#b45309" /> {movie.rating ?? '0'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{movie.title || movie.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      {movie.releaseYear || movie.release_year || 'S/A'} | {movie.director || 'Não informado'}
                    </p>
                  </div>

                  <Link
                    to={`/movies/${movie.id || movie._id}`}
                    className="btn btn-outline"
                    style={{ textAlign: 'center', marginTop: '12px' }}
                  >
                    Ver Detalhes
                  </Link>
                </article>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}