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

const ColorsTable = () => {
  const [colors, setColors] = useState([]);
  const [createModalIsOpen, setCreateModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    color: '',
    display: '',
  });
  const [editFormData, setEditFormData] = useState({
    id: null,
    color: '',
    display: '',
    status: false,
  });

  // Fetch colors from backend
  const fetchColors = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/colors`);
      setColors(res.data);
    } catch (err) {
      console.error('Error fetching colors:', err);
    }
  };

  useEffect(() => {
    fetchColors();
  }, []);

  // Open and close create modal
  const openCreateModal = () => {
    setFormData({ color: '', display: '' });
    setCreateModalIsOpen(true);
  };
  const closeCreateModal = () => setCreateModalIsOpen(false);

  // Open and close edit modal
  const openEditModal = (color) => {
    setEditFormData({
      id: color.id,
      color: color.color,
      display: color.display,
      status: color.status || false,
    });
    setEditModalIsOpen(true);
  };
  const closeEditModal = () => setEditModalIsOpen(false);

  // Validate hex color
  const isValidHex = (hex) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);

  // Handle changes in create form inputs
  const handleCreateChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Handle changes in edit form inputs
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Submit create form
  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    if (!formData.color || !formData.display) {
      toast.error('El color y nombre son requeridos.');
      return;
    }

    if (!isValidHex(formData.color)) {
      toast.error('El color debe ser un codigo hexadecimal valido (ej. #FF0000).');
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API}/colors`, formData);
      closeCreateModal();
      fetchColors();
    } catch (err) {
      console.error('Error creating color:', err);
      toast.error(`Error al crear color. ${err?.response?.data?.message || ''}`);
    }
  };

  // Submit edit form
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.color || !editFormData.display) {
      toast.error('El color y nombre son requeridos.');
      return;
    }

    if (!isValidHex(editFormData.color)) {
      toast.error('El color debe ser un codigo hexadecimal valido (ej. #FF0000).');
      return;
    }

    try {
      await axios.put(`${import.meta.env.VITE_API}/colors/${editFormData.id}`, {
        color: editFormData.color,
        display: editFormData.display,
        status: editFormData.status,
      });
      closeEditModal();
      fetchColors();
    } catch (err) {
      console.error('Error updating color:', err);
      toast.error(`Error al crear color. ${err?.response?.data?.message || ''}`);
    }
  };

  // Use hook for filter
  const { filteredData: filteredColors, FilterControls } = useStatusFilter(colors);

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Colores</h2>

      <FilterControls />

      <button
        onClick={openCreateModal}
        className="mb-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
      >
        <i className="fas fa-plus"></i>
        Nuevo color
      </button>

      <table className="w-full border border-gray-300 rounded-md overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-center px-4 py-2 border-b border-gray-300">Color</th>
            <th className="text-left px-4 py-2 border-b border-gray-300">Nombre</th>
            <th className="text-center px-4 py-2 border-b border-gray-300">Estatus</th>
            <th className="text-center px-4 py-2 border-b border-gray-300">Editar</th>
          </tr>
        </thead>
        <tbody>
          {filteredColors.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center py-4 text-gray-500">
                No se encontraron colores.
              </td>
            </tr>
          ) : (
            filteredColors.map(({ id, color, display, status }) => (
              <tr key={id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b border-gray-300 text-center">
                  <div
                    className="w-8 h-8 rounded-full border border-gray-300 mx-auto"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                </td>
                <td className="px-4 py-2 border-b border-gray-300">{display}</td>
                <td className="px-4 py-2 border-b border-gray-300 text-center">
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
                <td className="px-4 py-2 border-b border-gray-300 text-center">
                  <button
                    onClick={() => openEditModal({ id, color, display, status })}
                    className="text-blue-600 hover:underline"
                    title="Edit Color"
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
        isOpen={createModalIsOpen}
        onRequestClose={closeCreateModal}
        style={customStyles}
        contentLabel="Add New Color"
      >
        <h2 className="text-xl font-semibold mb-4">Añadir nuevo color</h2>
        <form onSubmit={handleCreateSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="colorPicker">
              Color Picker:
            </label>
            <input
              id="colorPicker"
              type="color"
              name="color"
              value={formData.color || '#ffffff'}
              onChange={handleCreateChange}
              className="w-12 h-8 p-0 border-none cursor-pointer"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="color">
              Color (Hexadecimal):
            </label>
            <input
              id="color"
              type="text"
              name="color"
              value={formData.color}
              onChange={handleCreateChange}
              placeholder="#FFFFFF"
              maxLength={7}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="display">
              Nombre:
            </label>
            <input
              id="display"
              type="text"
              name="display"
              value={formData.display}
              onChange={handleCreateChange}
              placeholder="Rojo"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeCreateModal}
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
              Añadir Color
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalIsOpen}
        onRequestClose={closeEditModal}
        style={customStyles}
        contentLabel="Edit Color"
      >
        <h2 className="text-xl font-semibold mb-4">Editar Color</h2>
        <form onSubmit={handleEditSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-colorPicker">
              Color Picker:
            </label>
            <input
              id="edit-colorPicker"
              type="color"
              name="color"
              value={editFormData.color || '#ffffff'}
              onChange={handleEditChange}
              className="w-12 h-8 p-0 border-none cursor-pointer"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-color">
              Color (Hexadecimal):
            </label>
            <input
              id="edit-color"
              type="text"
              name="color"
              value={editFormData.color}
              onChange={handleEditChange}
              placeholder="#FFFFFF"
              maxLength={7}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-display">
              Nombre:
            </label>
            <input
              id="edit-display"
              type="text"
              name="display"
              value={editFormData.display}
              onChange={handleEditChange}
              placeholder="Rojo"
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
                  setEditFormData((prev) => ({ ...prev, status: !prev.status }))
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

export default ColorsTable;