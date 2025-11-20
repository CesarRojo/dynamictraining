import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import useStatusFilter from './hooks/useStatusFilter';

// Modal styles
const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '400px',
    padding: '1.5rem',
    borderRadius: '0.5rem',
  },
};

Modal.setAppElement('#root');

const PlantsTable = () => {
  const [plants, setPlants] = useState([]);
  const [sections, setSections] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sectionId: '',
    status: true, // default active
  });
  const [editFormData, setEditFormData] = useState({
    id: null,
    name: '',
    code: '',
    status: false,
  });
  const [error, setError] = useState('');

  // Fetch plants
  const fetchPlants = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/plants`);
      setPlants(res.data);
    } catch (err) {
      console.error('Error fetching plants:', err);
    }
  };

  // Fetch sections
  const fetchSections = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/sections`);
      setSections(res.data);
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  useEffect(() => {
    fetchPlants();
    fetchSections();
  }, []);

  // Open/close create modal
  const openModal = () => {
    setFormData({ name: '', code: '', sectionId: '', status: true });
    setModalIsOpen(true);
  };
  const closeModal = () => setModalIsOpen(false);

  // Open/close edit modal
  const openEditModal = (plant) => {
    setEditFormData({
      id: plant.id,
      name: plant.name,
      code: plant.code,
      status: plant.status || false,
    });
    setEditModalIsOpen(true);
  };
  const closeEditModal = () => setEditModalIsOpen(false);

  // Handle create form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle edit form changes
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Submit create form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Nombre y color requerido.');
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API}/plants`, {
        name: formData.name.trim(),
        code: formData.code.trim(),
        status: formData.status,
      });
      closeModal();
      fetchPlants();
    } catch (err) {
      console.error('Error creating plant:', err);
      toast.error(`Error al crear planta. ${err?.response?.data?.message || ''}`);
    }
  };

  // Submit edit form
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.name.trim() || !editFormData.code.trim()) {
      toast.error('Nombre y color requerido.');
      return;
    }

    try {
      await axios.put(`${import.meta.env.VITE_API}/plants/${editFormData.id}`, {
        name: editFormData.name.trim(),
        code: editFormData.code.trim(),
        status: editFormData.status,
      });
      closeEditModal();
      fetchPlants();
    } catch (err) {
      console.error('Error updating plant:', err);
      toast.error(`Error al actualizar planta. ${err?.response?.data?.message || ''}`);
    }
  };

  // Use hook for filter
  const { filteredData: filteredPlants, FilterControls } = useStatusFilter(plants);

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Plantas</h2>

      <FilterControls />

      <button
        onClick={openModal}
        className="mb-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
      >
        <i className="fas fa-plus"></i>
        Nueva planta
      </button>

      <table className="w-full border border-gray-300 rounded-md overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-4 py-2 border-b border-gray-300">Nombre</th>
            <th className="text-left px-4 py-2 border-b border-gray-300">Codigo</th>
            <th className="text-left px-4 py-2 border-b border-gray-300">Estatus</th>
            <th className="text-left px-4 py-2 border-b border-gray-300">Editar</th>
          </tr>
        </thead>
        <tbody>
          {filteredPlants.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center py-4 text-gray-500">Sin plantas.</td>
            </tr>
          ) : (
            filteredPlants.map(({ id, name, code, status }) => (
              <tr key={id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b border-gray-300">{name}</td>
                <td className="px-4 py-2 border-b border-gray-300">{code}</td>
                <td className="px-4 py-2 border-b border-gray-300">
                  {status ? (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 border-b border-gray-300">
                  <button
                    onClick={() => openEditModal({ id, name, code, status })}
                    className="text-blue-600 hover:underline"
                    title="Editar Planta"
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Create Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Add New Plant"
      >
        <h2 className="text-xl font-semibold mb-4">Añadir nueva planta</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block mb-1 font-medium">
              Nombre planta:
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nombre planta"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="code" className="block mb-1 font-medium">
              Codigo:
            </label>
            <input
              id="code"
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Codigo planta"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status toggle */}
          <div className="mb-6 flex items-center gap-3">
            <label htmlFor="status" className="font-medium">
              Estatus activo:
            </label>
            <div className="relative">
              <input
                type="checkbox"
                id="status"
                name="status"
                checked={formData.status}
                onChange={handleChange}
                className="sr-only"
              />
              <div
                className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${
                  formData.status ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, status: !prev.status }))}
              />
              <div
                className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  formData.status ? 'translate-x-5' : 'translate-x-0'
                }`}
                style={{ pointerEvents: 'none' }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
            >
              <i className="fas fa-times"></i>
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              <i className="fas fa-check"></i>
              Añadir planta
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalIsOpen}
        onRequestClose={closeEditModal}
        style={customStyles}
        contentLabel="Edit Plant"
      >
        <h2 className="text-xl font-semibold mb-4">Editar Planta</h2>
        <form onSubmit={handleEditSubmit}>
          <div className="mb-4">
            <label htmlFor="edit-name" className="block mb-1 font-medium">
              Nombre planta:
            </label>
            <input
              id="edit-name"
              type="text"
              name="name"
              value={editFormData.name}
              onChange={handleEditChange}
              placeholder="Nombre planta"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="edit-code" className="block mb-1 font-medium">
              Codigo:
            </label>
            <input
              id="edit-code"
              type="text"
              name="code"
              value={editFormData.code}
              onChange={handleEditChange}
              placeholder="Codigo planta"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status toggle */}
          <div className="mb-6 flex items-center gap-3">
            <label htmlFor="edit-status" className="font-medium">
              Estatus activo:
            </label>
            <div className="relative">
              <input
                type="checkbox"
                id="edit-status"
                name="status"
                checked={editFormData.status}
                onChange={handleEditChange}
                className="sr-only"
              />
              <div
                className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${
                  editFormData.status ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={() =>
                  setEditFormData(prev => ({ ...prev, status: !prev.status }))
                }
              />
              <div
                className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  editFormData.status ? 'translate-x-5' : 'translate-x-0'
                }`}
                style={{ pointerEvents: 'none' }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeEditModal}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
            >
              <i className="fas fa-times"></i>
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              <i className="fas fa-check"></i>
              Guardar cambios
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PlantsTable;