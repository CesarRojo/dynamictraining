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

const DataTable = () => {
  const [dataEntries, setDataEntries] = useState([]);
  const [colors, setColors] = useState([]);
  const [sections, setSections] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    value: '',
    colorId: '',
    sectionId: '',
    status: true, // default active
  });
  const [editFormData, setEditFormData] = useState({
    id: null,
    value: '',
    colorId: '',
    sectionId: '',
    status: true,
  });
  const user = JSON.parse(sessionStorage.getItem('user'));
  const plant = user?.plant;

  // Use hook for filter
  const { filteredData: filteredDataEntries, FilterControls } = useStatusFilter(dataEntries);

  // Fetch data entries
  const fetchDataEntries = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/data/plant`, 
        { params: { plant } }
      );
      setDataEntries(res.data);
    } catch (err) {
      console.error('Error fetching data entries:', err);
      toast.error('Error al cargar data.');
    }
  };

  // Fetch colors for select dropdown
  const fetchColors = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/colors`);
      setColors(res.data);
    } catch (err) {
      console.error('Error fetching colors:', err);
      toast.error('Error al cargar colores.');
    }
  };

  // Fetch sections for select dropdown
  const fetchSections = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/sections/plant`, 
        { params: { plant } }
      );
      setSections(res.data);
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  useEffect(() => {
    fetchDataEntries();
    fetchColors();
    fetchSections();
  }, []);

  const groupedData = filteredDataEntries.reduce((acc, entry) => {
    const sectionName = entry.section?.name || 'Sin seccion';
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(entry);
    return acc;
  }, {});

  // Open and close create modal
  const openModal = () => {
    setFormData({ value: '', colorId: '', sectionId: '', status: true });
    setModalIsOpen(true);
  };
  const closeModal = () => setModalIsOpen(false);

  // Open and close edit modal
  const openEditModal = (entry) => {
    setEditFormData({
      id: entry.id,
      value: entry.value || '',
      colorId: entry.color?.id || '',
      sectionId: entry.section?.id || '',
      status: entry.status ?? true,
    });
    setEditModalIsOpen(true);
  };
  const closeEditModal = () => setEditModalIsOpen(false);

  // Handle create form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle edit form input changes
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

    if (!formData.value.trim() || !formData.colorId || !formData.sectionId) {
      toast.error('Valor, color y seccion son requeridos.');
      return;
    }

    try {
      const payload = {
        value: formData.value.trim(),
        colorId: Number(formData.colorId),
        sectionId: Number(formData.sectionId),
        status: formData.status,
      };
      await axios.post(`${import.meta.env.VITE_API}/data`, payload);
      toast.success('Data creada exitosamente.');
      closeModal();
      fetchDataEntries();
    } catch (err) {
      console.error('Error creating data entry:', err);
      toast.error(`Error al crear data. ${err?.response?.data?.message || ''}`);
    }
  };

  // Submit edit form
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.value.trim() || !editFormData.colorId || !editFormData.sectionId) {
      toast.error('Valor, color y seccion son requeridos.');
      return;
    }

    try {
      const payload = {
        value: editFormData.value.trim(),
        colorId: Number(editFormData.colorId),
        sectionId: Number(editFormData.sectionId),
        status: editFormData.status,
      };
      await axios.put(`${import.meta.env.VITE_API}/data/${editFormData.id}`, payload);
      toast.success('Data actualizada exitosamente.');
      closeEditModal();
      fetchDataEntries();
    } catch (err) {
      console.error('Error updating data entry:', err);
      toast.error(`Error al actualizar data. ${err?.response?.data?.message || ''}`);
    }
  };

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Data</h2>

      <FilterControls />

      <div className="flex gap-3 mb-4">
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          title="Add New Data"
        >
          <i className="fas fa-plus"></i>
          Nueva data
        </button>
      </div>

      <div className="flex flex-row gap-5 flex-wrap">
        {Object.entries(groupedData).map(([sectionName, entries]) => (
          <div key={sectionName} className="mb-10 w-full md:w-1/2 lg:w-1/3">
            <h3 className="text-lg font-semibold mb-3">Seccion: {sectionName}</h3>
            <table className="w-full border border-gray-300 rounded-md overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Valor</th>
                  <th className="text-center px-4 py-2 border-b border-gray-300">Color</th>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Nombre color</th>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Estatus</th>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Editar</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">
                      No se encontró data.
                    </td>
                  </tr>
                ) : (
                  entries.map(({ id, value, color, status, section }) => (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b border-gray-300">{value}</td>
                      <td className="px-4 py-2 border-b border-gray-300 text-center">
                        <div
                          className="w-8 h-8 rounded-full border border-gray-300 mx-auto"
                          style={{ backgroundColor: color?.color || '#ccc' }}
                          title={color?.color || 'No color'}
                        />
                      </td>
                      <td className="px-4 py-2 border-b border-gray-300">{color?.display || 'N/A'}</td>
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
                          onClick={() => openEditModal({ id, value, color, section, status })}
                          className="text-blue-600 hover:underline"
                          title="Edit Data Entry"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Add New Data Entry"
      >
        <h2 className="text-xl font-semibold mb-4">Añadir nueva data</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="value">
              Valor:
            </label>
            <input
              id="value"
              type="text"
              name="value"
              value={formData.value}
              onChange={handleChange}
              placeholder="Ingrese valor"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="colorId">
              Color:
            </label>
            <select
              id="colorId"
              name="colorId"
              value={formData.colorId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccione Color --</option>
              {colors.map(({ id, display }) => (
                <option key={id} value={id}>
                  {display}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="sectionId">
              Seccion:
            </label>
            <select
              id="sectionId"
              name="sectionId"
              value={formData.sectionId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccione sección --</option>
              {sections.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
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
              Añadir data
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalIsOpen}
        onRequestClose={closeEditModal}
        style={customStyles}
        contentLabel="Edit Data Entry"
      >
        <h2 className="text-xl font-semibold mb-4">Editar Data</h2>
        <form onSubmit={handleEditSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-value">
              Valor:
            </label>
            <input
              id="edit-value"
              type="text"
              name="value"
              value={editFormData.value}
              onChange={handleEditChange}
              placeholder="Ingrese valor"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-colorId">
              Color:
            </label>
            <select
              id="edit-colorId"
              name="colorId"
              value={editFormData.colorId}
              onChange={handleEditChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccione Color --</option>
              {colors.map(({ id, display }) => (
                <option key={id} value={id}>
                  {display}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-sectionId">
              Section:
            </label>
            <select
              id="edit-sectionId"
              name="sectionId"
              value={editFormData.sectionId}
              onChange={handleEditChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccione Seccion --</option>
              {sections.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
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

export default DataTable;