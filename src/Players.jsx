import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const PlayersTable = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    plant: '',
    game: '',
    clock: '',
    completedAt: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [plants, setPlants] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user'));
  const plant = user?.plant;

  // Opciones de juegos
  const gameOptions = [
    '',
    'Ordenar Color',
    'Calibres',
  ];

  // Fetch plants para el filtro
  const fetchPlants = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/plants/name`, 
        { params: { name: plant } }
      );
      const data = res.data;
      const normalizedData = Array.isArray(data) ? data : [data];
      setPlants(normalizedData);
    } catch (err) {
      console.error('Error fetching plants:', err);
      toast.error('Error al cargar plantas.');
    }
  };

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page,
        pageSize,
      };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const res = await axios.get(`${import.meta.env.VITE_API}/players`, { params });
      setPlayers(res.data.players);
      setTotalCount(res.data.totalCount);
    } catch (err) {
      console.error('Error fetching players:', err);
      toast.error('Error al cargar jugadores.');
    } finally {
      setLoading(false);
    }
  };

  // Function to obtain player details
  const fetchPlayerDetails = async (id) => {
    setModalLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/players/${id}`);
      setSelectedPlayer(res.data);
      setModalOpen(true);
    } catch (err) {
      console.error('Error fetching player details:', err);
      toast.error('Error al cargar los detalles del jugador.');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [filters, page]);

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Jugadores</h2>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        {/* Plant select */}
        <select
          value={filters.plant}
          onChange={e => {
            setFilters(prev => ({ ...prev, plant: e.target.value }));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        >
          <option value="">-- Filtrar por planta --</option>
          {plants.map(plant => (
            <option key={plant.id} value={plant.name}>
              {plant.name}
            </option>
          ))}
        </select>

        {/* Game select */}
        <select
          value={filters.game}
          onChange={e => {
            setFilters(prev => ({ ...prev, game: e.target.value }));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        >
          {gameOptions.map((game, idx) => (
            <option key={idx} value={game}>
              {game === '' ? '-- Filtrar por juego --' : game}
            </option>
          ))}
        </select>

        {/* Clock input */}
        <input
          type="text"
          placeholder="Filtrar por reloj"
          value={filters.clock}
          onChange={e => {
            setFilters(prev => ({ ...prev, clock: e.target.value }));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        />

        {/* CompletedAt input */}
        <input
          type="date"
          placeholder="Filtrar por fecha completada"
          value={filters.completedAt}
          onChange={e => {
            setFilters(prev => ({ ...prev, completedAt: e.target.value }));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        />

        <button
          onClick={() => {
            setFilters({ plant: '', game: '', clock: '', completedAt: '' });
            setPage(1);
          }}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          <i className="fa-solid fa-broom mr-1"></i>
          Limpiar filtros
        </button>
        <button
          onClick={() => navigate('/playersclasif')}
          className="bg-orange-500 text-white px-3 py-1 rounded"
        >
          <i className="fa-solid fa-chart-line mr-1"></i>
          Clasificacion
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Cargando jugadores...</p>
      ) : (
        <>
          <table className="w-full border border-gray-300 rounded-md overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-center px-4 py-2 border-b border-gray-300">ID</th>
                <th className="text-center px-4 py-2 border-b border-gray-300">Reloj</th>
                <th className="text-left px-4 py-2 border-b border-gray-300">Planta</th>
                <th className="text-left px-4 py-2 border-b border-gray-300">Juego</th>
                <th className="text-center px-4 py-2 border-b border-gray-300">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    No se encontraron jugadores.
                  </td>
                </tr>
              ) : (
                players.map(
                  ({ id, clock, plant, game, createdAt }) => (
                    <tr
                      key={id}
                      onClick={() => fetchPlayerDetails(id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                    >
                      <td className="px-4 py-2 border-b border-gray-300 text-center">{id}</td>
                      <td className="px-4 py-2 border-b border-gray-300 text-center">{clock}</td>
                      <td className="px-4 py-2 border-b border-gray-300">{plant}</td>
                      <td className="px-4 py-2 border-b border-gray-300">{game}</td>
                      <td className="px-4 py-2 border-b border-gray-300 text-center">
                        {new Date(createdAt).toISOString().split('T')[0]}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="mt-4 flex justify-between items-center">
            <p>
              Pagina {page} de {Math.ceil(totalCount / pageSize)} ({totalCount} jugadores)
            </p>
            <div className="space-x-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => (p * pageSize < totalCount ? p + 1 : p))}
                disabled={page * pageSize >= totalCount}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition"
              aria-label="Close modal"
            >
              <svg xmlns="  http://www.w3.org/2000/svg"   className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {modalLoading ? (
              <p className="text-center text-gray-500">Cargando detalles del jugador...</p>
            ) : (
              <>
                {/* Player */}
                <div className="mb-6 p-6 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 rounded-lg text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-3xl font-bold mb-2">Jugador #{selectedPlayer.id}</h3>
                    <p className="text-lg"><span className="font-semibold">Reloj:</span> {selectedPlayer.clock}</p>
                    <p className="text-lg"><span className="font-semibold">Planta:</span> {selectedPlayer.plant}</p>
                    <p className="text-lg"><span className="font-semibold">Juego:</span> {selectedPlayer.game}</p>
                    <p className="text-lg"><span className="font-semibold">Fecha creado:</span> {selectedPlayer.createdAt.split('T')[0]}</p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <i className="fa-regular fa-user fa-6x"></i>
                  </div>
                </div>

                {/* Completed sections table */}
                <div>
                  <h4 className="text-xl font-semibold mb-4 border-b border-gray-300 pb-2">Secciones completadas</h4>
                  {selectedPlayer.completedSections.length === 0 ? (
                    <p className="text-center text-gray-500">No se encontraron secciones completadas.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
                        <thead className="bg-gradient-to-r from-blue-300 to-indigo-300 text-gray-700">
                          <tr>
                            <th className="px-4 py-2 border-r border-gray-400 text-left">Nombre</th>
                            <th className="px-4 py-2 border-r border-gray-400 text-center">Fecha completado</th>
                            <th className="px-4 py-2 border-r border-gray-400 text-center">Tiempo</th>
                            <th className="px-4 py-2 text-center">Correctos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPlayer.completedSections.map(cs => (
                            <tr
                              key={cs.id}
                              className="even:bg-gray-50 hover:bg-indigo-100 transition-colors duration-150"
                            >
                              <td className="px-4 py-3 border-r border-gray-300 font-medium">{cs.section.name}</td>
                              <td className="px-4 py-3 border-r border-gray-300 text-center">
                                {cs.completedAt.split('T')[1].split('.')[0]}
                              </td>
                              <td className="px-4 py-3 border-r border-gray-300 text-center">
                                {cs.timeTaken || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-center">{cs.correctCount || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayersTable;