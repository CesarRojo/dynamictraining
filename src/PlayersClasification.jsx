import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Convierte "hh:mm:ss" o "mm:ss" a segundos
const parseTimeToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

// Convierte segundos a "hh:mm:ss" o "mm:ss" 
const formatSecondsToTime = (seconds) => {
  if (seconds === 0) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return [h, m, s].map(n => n.toString().padStart(2, '0')).join(':');
  }
  return [m, s].map(n => n.toString().padStart(2, '0')).join(':');
};

// Obtiene la fecha actual en formato yyyy-mm-dd
const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const PlayersClasification = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    plant: '',
    game: 'Ordenar Color',
    clock: '',
    completedAt: getTodayDateString(), // Por defecto hoy
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [plants, setPlants] = useState([]);

  // Opciones de juegos (igual que en PlayersTable)
  const gameOptions = [
    'Ordenar Color',
    'Calibres',
  ];

  // Obtener usuario y planta para filtrar plantas (igual que en PlayersTable)
  const user = JSON.parse(sessionStorage.getItem('user'));
  const plantUser = user?.plant;

  // Fetch plants para el filtro
  const fetchPlants = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/plants/name`, 
        { params: { name: plantUser } }
      );
      const data = res.data;
      const normalizedData = Array.isArray(data) ? data : [data];
      setPlants(normalizedData);
    } catch (err) {
      console.error('Error fetching plants:', err);
      toast.error('Error al cargar plantas.');
    }
  };

  const fetchPlayersClasification = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page,
        pageSize,
      };
      // No eliminar completedAt para que siempre se envíe
      Object.keys(params).forEach(key => {
        if (key !== 'completedAt' && !params[key]) delete params[key];
      });

      const res = await axios.get(`${import.meta.env.VITE_API}/players/clasification`, { params });
      const fetchedPlayers = res.data.players;

      const grouped = {};

      fetchedPlayers.forEach(player => {
        const key = `${player.clock}__${player.game}`; // clave única por jugador y juego

        if (!grouped[key]) {
          grouped[key] = {
            clock: player.clock,
            game: player.game,
            plant: player.plant,
            attemptsCount: 0,
            totalSeconds: 0,
            avgCorrectPerAttempt: 0,
            createdAt: player.createdAt,
          };
        }

        // Contar intentos únicos (usamos player.attempts.length)
        const attemptsCount = player.attempts.length;

        // Agrupar completedSections por attemptId
        const attemptsMap = {};
        player.completedSections.forEach(cs => {
          if (!attemptsMap[cs.attemptId]) {
            attemptsMap[cs.attemptId] = {
              totalCorrect: 0,
              totalSections: 0,
              totalSeconds: 0,
            };
          }

          // Extraer número de correctas (antes de la barra)
          const correctStr = cs.correctCount ? cs.correctCount.split('/')[0].trim() : '0';
          const correctNum = parseInt(correctStr, 10) || 0;

          attemptsMap[cs.attemptId].totalCorrect += correctNum;
          attemptsMap[cs.attemptId].totalSections += 1;
          attemptsMap[cs.attemptId].totalSeconds += parseTimeToSeconds(cs.timeTaken);
        });

        // Calcular promedio correctas por intento y sumar tiempos totales
        let sumAvgCorrect = 0;
        let sumTotalSeconds = 0;
        let attemptsWithData = 0;

        Object.values(attemptsMap).forEach(attemptData => {
          if (attemptData.totalSections > 0) {
            const avgCorrect = attemptData.totalCorrect / attemptData.totalSections;
            sumAvgCorrect += avgCorrect;
            sumTotalSeconds += attemptData.totalSeconds;
            attemptsWithData++;
          }
        });

        const avgCorrectPerAttempt = attemptsWithData > 0 ? sumAvgCorrect / attemptsWithData : 0;

        grouped[key].attemptsCount = attemptsCount;
        grouped[key].totalSeconds = sumTotalSeconds;
        grouped[key].avgCorrectPerAttempt = avgCorrectPerAttempt;

        // Update createdAt if it's older
        if (new Date(player.createdAt) < new Date(grouped[key].createdAt)) {
          grouped[key].createdAt = player.createdAt;
        }
      });

      const playersArray = Object.values(grouped);

      playersArray.sort((a, b) => {
        if (a.attemptsCount !== b.attemptsCount) {
          return a.attemptsCount - b.attemptsCount;
        }
        if (a.totalSeconds !== b.totalSeconds) {
          return a.totalSeconds - b.totalSeconds;
        }
        return b.avgCorrectPerAttempt - a.avgCorrectPerAttempt;
      });

      setPlayers(playersArray);
      setTotalCount(res.data.totalCount || playersArray.length);
    } catch (err) {
      console.error('Error fetching players clasification:', err);
      toast.error('Error al obtener la clasificación de jugadores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  useEffect(() => {
    fetchPlayersClasification();
  }, [filters, page]);

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Clasificación de Jugadores</h2>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4 items-end">
        {/* Plant select */}
        <select
          value={filters.plant}
          onChange={e => {
            setFilters(prev => ({ ...prev, plant: e.target.value }));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        >
          <option value="">-- Filtrar por Planta --</option>
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
              {game}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Filtrar por Reloj"
          value={filters.clock}
          onChange={e => {
            setFilters(prev => ({ ...prev, clock: e.target.value }));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        />

        <div>
          <label className="block text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            value={filters.completedAt}
            onChange={e => {
              setFilters(prev => ({ ...prev, completedAt: e.target.value }));
              setPage(1);
            }}
            className="border px-2 py-1 rounded"
            max={getTodayDateString()}
          />
        </div>

        <button
          onClick={() => {
            setFilters({
              plant: '',
              game: '',
              clock: '',
              completedAt: getTodayDateString(),
            });
            setPage(1);
          }}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          <i className="fa-solid fa-broom mr-1"></i>
          Limpiar filtros
        </button>
      </div>

      {/* Podio */}
      {players.length > 0 && (
        <div className="mb-8 flex justify-center gap-8">
          {[1, 0, 2].map((pos) => {
            const player = players[pos];
            if (!player) return null;

            const medals = ['🥇', '🥈', '🥉'];
            const medalColors = ['gold', 'silver', '#cd7f32'];

            return (
              <div
                key={player.clock}
                className="flex flex-col items-center rounded-lg shadow-lg p-6 w-48"
                style={{ backgroundColor: medalColors[pos] }}
              >
                <div className="text-5xl mb-2">{medals[pos]}</div>
                <h3 className="text-xl font-bold mb-1 text-white">Jugador {player.clock}</h3>
                <p className="text-white font-semibold">Planta: {player.plant}</p>
                <p className="text-white font-semibold">Juego: {player.game}</p>
                <p className="text-white font-semibold">Intentos: {player.attemptsCount}</p>
                <p className="text-white mt-2">
                  Tiempo total: {formatSecondsToTime(player.totalSeconds)}
                </p>
                <p className="text-white">Promedio respuestas correctas: {player.avgCorrectPerAttempt.toFixed(2)}</p>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500">Cargando clasificación...</p>
      ) : (
        <>
          <table className="w-full border border-gray-300 rounded-md overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-center px-4 py-2 border-b border-gray-300">Reloj</th>
                <th className="text-left px-4 py-2 border-b border-gray-300">Planta</th>
                <th className="text-left px-4 py-2 border-b border-gray-300">Juego</th>
                <th className="text-center px-4 py-2 border-b border-gray-300">Intentos</th>
                <th className="text-center px-4 py-2 border-b border-gray-300">Tiempo Total</th>
                <th className="text-center px-4 py-2 border-b border-gray-300">Promedio Respuestas Correctas</th>
                <th className="text-center px-4 py-2 border-b border-gray-300">Fecha Primer Intento</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-500">
                    No se encontraron jugadores.
                  </td>
                </tr>
              ) : (
                players.map(({ clock, plant, game, attemptsCount, totalSeconds, avgCorrectPerAttempt, createdAt }) => (
                  <tr key={clock} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-4 py-2 border-b border-gray-300 text-center">{clock}</td>
                    <td className="px-4 py-2 border-b border-gray-300">{plant}</td>
                    <td className="px-4 py-2 border-b border-gray-300">{game}</td>
                    <td className="px-4 py-2 border-b border-gray-300 text-center">{attemptsCount}</td>
                    <td className="px-4 py-2 border-b border-gray-300 text-center">{formatSecondsToTime(totalSeconds)}</td>
                    <td className="px-4 py-2 border-b border-gray-300 text-center">{avgCorrectPerAttempt.toFixed(2)}</td>
                    <td className="px-4 py-2 border-b border-gray-300 text-center">{new Date(createdAt).toISOString().split('T')[0]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="mt-4 flex justify-between items-center">
            <p>
              Página {page} de {Math.ceil(totalCount / pageSize)} ({totalCount} jugadores)
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
    </div>
  );
};

export default PlayersClasification;