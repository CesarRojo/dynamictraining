import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

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
      toast.error('Failed to fetch players.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [filters, page]);

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Players</h2>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Filter by Plant"
          value={filters.plant}
          onChange={e => {
            setFilters(prev => ({ ...prev, plant: e.target.value }));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        />
        <input
          type="text"
          placeholder="Filter by Game"
          value={filters.game}
          onChange={e => {
            setFilters(prev => ({ ...prev, game: e.target.value }));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        />
        <input
          type="text"
          placeholder="Filter by Clock"
          value={filters.clock}
          onChange={e => {
            setFilters(prev => ({ ...prev, clock: e.target.value }));
            setPage(1);
          }}
          className="border px-2 py-1 rounded"
        />
        <input
          type="date"
          placeholder="Filter by Completed At"
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
          Clear Filters
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading players...</p>
      ) : (
        <>
          <table className="w-full border border-gray-300 rounded-md overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-center px-4 py-2 border-b border-gray-300">ID</th>
                <th className="text-center px-4 py-2 border-b border-gray-300">Clock</th>
                <th className="text-left px-4 py-2 border-b border-gray-300">Plant</th>
                <th className="text-left px-4 py-2 border-b border-gray-300">Game</th>
                <th className="text-center px-4 py-2 border-b border-gray-300">Completed At</th>
                <th className="text-left px-4 py-2 border-b border-gray-300">Completed Sections</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    No players found.
                  </td>
                </tr>
              ) : (
                players.map(
                  ({ id, clock, plant, game, createdAt, completedSections }) => (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b border-gray-300 text-center">{id}</td>
                      <td className="px-4 py-2 border-b border-gray-300 text-center">{clock}</td>
                      <td className="px-4 py-2 border-b border-gray-300">{plant}</td>
                      <td className="px-4 py-2 border-b border-gray-300">{game}</td>
                      <td className="px-4 py-2 border-b border-gray-300 text-center">
                        {new Date(createdAt).toISOString().split('.')[0].replace('T', ' ')}
                      </td>
                      <td className="px-4 py-2 border-b border-gray-300">
                        {completedSections.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1">
                            {completedSections.map(({ id: csId, section }) => (
                              <span
                                key={csId}
                                className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold"
                              >
                                {section.name}
                              </span>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400 italic">No sections completed</span>
                        )}
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
              Page {page} of {Math.ceil(totalCount / pageSize)} ({totalCount} players)
            </p>
            <div className="space-x-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => (p * pageSize < totalCount ? p + 1 : p))}
                disabled={page * pageSize >= totalCount}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PlayersTable;