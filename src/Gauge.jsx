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
    width: '450px',
    padding: '1.5rem',
    borderRadius: '0.5rem',
  },
};

Modal.setAppElement('#root');

const GaugeTable = () => {
  const [gauges, setGauges] = useState([]);
  const [insulators, setInsulators] = useState([]);
  const [sections, setSections] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    gauge: '',
    rings: '',
    features: '',
    insulatorId: '',
    sectionId: '',
    status: true, // default active
  });
  const [editFormData, setEditFormData] = useState({
    id: null,
    gauge: '',
    rings: '',
    features: '',
    insulatorId: '',
    sectionId: '',
    status: true,
  });

  const user = JSON.parse(sessionStorage.getItem('user'));
  const plant = user?.plant;

  // Use hook for filter
  const { filteredData: filteredGauges, FilterControls } = useStatusFilter(gauges);

  // Fetch gauges
  const fetchGauges = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/gauge`, {
        params: { plant },
      });
      setGauges(res.data);
    } catch (err) {
      console.error('Error fetching gauges:', err);
      toast.error('Error al cargar calibres.');
    }
  };

  // Fetch insulators for select dropdown
  const fetchInsulators = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/insulators`);
      setInsulators(res.data);
    } catch (err) {
      console.error('Error fetching insulators:', err);
      toast.error('Error al cargar aislantes.');
    }
  };

  // Fetch sections for select dropdown
  const fetchSections = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/sections/plant`, {
        params: { plant },
      });
      setSections(res.data);
    } catch (err) {
      console.error('Error fetching sections:', err);
      toast.error('Error al cargar secciones.');
    }
  };

  useEffect(() => {
    fetchGauges();
    fetchInsulators();
    fetchSections();
  }, []);

  // Group gauges by section name
  const groupedData = filteredGauges.reduce((acc, entry) => {
    const sectionName = entry?.sectionId || 'Sin seccion';
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(entry);
    return acc;
  }, {});

  // Open and close create modal
  const openModal = () => {
    setFormData({
      gauge: '',
      rings: '',
      features: '',
      insulatorId: '',
      sectionId: '',
      status: true,
    });
    setModalIsOpen(true);
  };
  const closeModal = () => setModalIsOpen(false);

  // Open and close edit modal
  const openEditModal = (entry) => {
    setEditFormData({
      id: entry.id,
      gauge: entry.gauge || '',
      rings: entry.rings !== undefined && entry.rings !== null ? String(entry.rings) : '',
      features: entry.features || '',
      insulatorId: entry.insulatorId || '',
      sectionId: Number(entry.sectionName) || '',
      status: entry.status ?? true,
    });
    setEditModalIsOpen(true);
  };
  const closeEditModal = () => setEditModalIsOpen(false);

  // Handle create form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle edit form input changes
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Validate form fields
  const validateForm = (data) => {
    if (!data.gauge.trim()) {
      toast.error('Calibre es requerido.');
      return false;
    }
    if (!data.features.trim()) {
      toast.error('Caracteristica es requerido.');
      return false;
    }
    if (!data.insulatorId) {
      toast.error('Aislante es requerido.');
      return false;
    }
    if (!data.sectionId) {
      toast.error('Seccion es requerido.');
      return false;
    }
    return true;
  };

  // Submit create form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm(formData)) return;

    try {
      const payload = {
        gauge: formData.gauge.trim(),
        rings: formData.rings || '-',
        features: formData.features.trim(),
        insulatorId: Number(formData.insulatorId),
        sectionId: Number(formData.sectionId),
        status: formData.status,
      };
      await axios.post(`${import.meta.env.VITE_API}/gauge`, payload);
      toast.success('Calibre creado exitosamente.');
      closeModal();
      fetchGauges();
    } catch (err) {
      console.error('Error creating gauge:', err);
      toast.error(`Error al crear el calibre. ${err?.response?.data?.message || ''}`);
    }
  };

  // Submit edit form
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm(editFormData)) return;

    try {
      const payload = {
        gauge: editFormData.gauge.trim(),
        rings: editFormData.rings,
        features: editFormData.features.trim(),
        insulatorId: Number(editFormData.insulatorId),
        sectionId: Number(editFormData.sectionId),
        status: editFormData.status,
      };
      await axios.put(`${import.meta.env.VITE_API}/gauge/${editFormData.id}`, payload);
      toast.success('Calibre actualizado exitosamente.');
      closeEditModal();
      fetchGauges();
    } catch (err) {
      console.error('Error updating gauge:', err);
      toast.error(`Error al actualizar el calibre. ${err?.response?.data?.message || ''}`);
    }
  };

  const searchSectionName = (sectionId) => {
    const section = sections.find(s => s.id === Number(sectionId));
    return section ? section.name : 'Seccion desconocida';
  }

  const searchInsulatorName = (insulatorId) => {
    const insulator = insulators.find(i => i.id === Number(insulatorId));
    return insulator ? insulator.name : 'Aislante desconocido';
  }

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Calibres</h2>

      <FilterControls />

      <div className="flex gap-3 mb-4">
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          title="Add New Gauge"
        >
          <i className="fas fa-plus"></i>
          Nuevo calibre
        </button>
      </div>

      <div className="flex flex-row gap-5 flex-wrap">
        {Object.entries(groupedData).map(([sectionName, entries]) => (
          <div key={sectionName} className="mb-10 w-full md:w-1/2 lg:w-1/3">
            <h3 className="text-lg font-semibold mb-3">Seccion: {searchSectionName(sectionName)}</h3>
            <table className="w-full border border-gray-300 rounded-md overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Calibre</th>
                  <th className="text-center px-4 py-2 border-b border-gray-300">Anillos</th>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Caracteristicas</th>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Aislante</th>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Estatus</th>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Editar</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-gray-500">
                      No se encontraron calibres.
                    </td>
                  </tr>
                ) : (
                  entries.map(({ id, gauge, rings, features, insulatorId, status }) => (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b border-gray-300">{gauge}</td>
                      <td className="px-4 py-2 border-b border-gray-300 text-center">{rings}</td>
                      <td className="px-4 py-2 border-b border-gray-300">{features}</td>
                      <td className="px-4 py-2 border-b border-gray-300">{searchInsulatorName(insulatorId) || 'N/A'}</td>
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
                          onClick={() =>
                            openEditModal({ id, gauge, rings, features, insulatorId, sectionName, status })
                          }
                          className="text-blue-600 hover:underline"
                          title="Edit Gauge"
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
        contentLabel="Add New Gauge"
      >
        <h2 className="text-xl font-semibold mb-4">Añadir nuevo calibre</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="gauge">
              Calibre:
            </label>
            <input
              id="gauge"
              type="text"
              name="gauge"
              value={formData.gauge}
              onChange={handleChange}
              placeholder="Calibre"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="rings">
              Anillos:
            </label>
            <input
              id="rings"
              type="text"
              name="rings"
              value={formData.rings}
              onChange={handleChange}
              placeholder="Ingrese numero de anillos"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="features">
              Caracteristicas:
            </label>
            <input
              id="features"
              type="text"
              name="features"
              value={formData.features}
              onChange={handleChange}
              placeholder="Ingrese caracteristicas"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="insulatorId">
              Aislante:
            </label>
            <select
              id="insulatorId"
              name="insulatorId"
              value={formData.insulatorId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccione Aislante --</option>
              {insulators.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
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
              <option value="">-- Seleccione seccion --</option>
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
                onClick={() => setFormData((prev) => ({ ...prev, status: !prev.status }))}
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
              Añadir calibre
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalIsOpen}
        onRequestClose={closeEditModal}
        style={customStyles}
        contentLabel="Edit Gauge"
      >
        <h2 className="text-xl font-semibold mb-4">Editar calibre</h2>
        <form onSubmit={handleEditSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-gauge">
              Calibre:
            </label>
            <input
              id="edit-gauge"
              type="text"
              name="gauge"
              value={editFormData.gauge}
              onChange={handleEditChange}
              placeholder="Ingrese calibre"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-rings">
              Anillos:
            </label>
            <input
              id="edit-rings"
              type="text"
              name="rings"
              value={editFormData.rings}
              onChange={handleEditChange}
              placeholder="Ingrese numero de anillos"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-features">
              Caracteristicas:
            </label>
            <input
              id="edit-features"
              type="text"
              name="features"
              value={editFormData.features}
              onChange={handleEditChange}
              placeholder="Ingrese caracteristicas"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-insulatorId">
              Aislante:
            </label>
            <select
              id="edit-insulatorId"
              name="insulatorId"
              value={editFormData.insulatorId}
              onChange={handleEditChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccione aislante --</option>
              {insulators.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-sectionId">
              Seccion:
            </label>
            <select
              id="edit-sectionId"
              name="sectionId"
              value={editFormData.sectionId}
              onChange={handleEditChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccione seccion --</option>
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

export default GaugeTable;