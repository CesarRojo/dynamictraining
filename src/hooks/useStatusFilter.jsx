import { useState, useMemo } from 'react';

const useStatusFilter = (data) => {
  // State for filter 'active' | 'inactive' | 'all'
  const [statusFilter, setStatusFilter] = useState('active');

  // Data filtered based on status
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(item => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return item.status === true;
      if (statusFilter === 'inactive') return item.status === false;
      return true;
    });
  }, [data, statusFilter]);

  // UI controls for filter
  const FilterControls = () => (
    <div className="mb-4 flex gap-3">
      <button
        className={`px-3 py-1 rounded ${statusFilter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        onClick={() => setStatusFilter('active')}
      >
        <i className="fas fa-check"></i> Actives
      </button>
      <button
        className={`px-3 py-1 rounded ${statusFilter === 'inactive' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
        onClick={() => setStatusFilter('inactive')}
      >
        <i className="fas fa-times"></i> Inactives
      </button>
      <button
        className={`px-3 py-1 rounded ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        onClick={() => setStatusFilter('all')}
      >
        <i className="fas fa-list"></i> All
      </button>
    </div>
  );

  return { filteredData, statusFilter, setStatusFilter, FilterControls };
};

export default useStatusFilter;