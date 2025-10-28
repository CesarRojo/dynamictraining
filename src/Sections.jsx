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

const SectionsTable = () => {
  const [sections, setSections] = useState([]);
  const [plants, setPlants] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', plantId: '' });
  const [editFormData, setEditFormData] = useState({ id: null, name: '', status: false });
  const user = JSON.parse(sessionStorage.getItem('user'));
  const plant = user?.plant;

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

  // Fetch plants for the dropdown
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
      toast.error('Failed to load plants.');
    }
  };

  useEffect(() => {
    fetchSections();
    fetchPlants(); // fetch plants on mount
  }, []);

  // Create section
  const openModal = () => {
    setFormData({ name: '', plantId: '' }); // reset including plantId
    setModalIsOpen(true);
  };
  const closeModal = () => setModalIsOpen(false);

  // Edit section
  const openEditModal = (section) => {
    setEditFormData({
      id: section.id,
      name: section.name,
      status: section.status,
    });
    setEditModalIsOpen(true);
  };
  const closeEditModal = () => setEditModalIsOpen(false);

  // Handling form changes create
  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Handling form changes edit
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Submit create
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!formData.plantId) {
      toast.error('Please select a plant.');
      return;
    }

    try {
      // Send plantId along with name
      await axios.post(`${import.meta.env.VITE_API}/sections`, {
        name: formData.name,
        plantId: Number(formData.plantId),
      });
      toast.success('Section created successfully');
      closeModal();
      fetchSections();
    } catch (err) {
      console.error('Error creating section:', err);
      toast.error(`Failed to create section. ${err?.response?.data?.message || ''}`);
    }
  };

  // Submit edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    try {
      await axios.put(`${import.meta.env.VITE_API}/sections/${editFormData.id}`, {
        name: editFormData.name,
        status: editFormData.status,
      });
      toast.success('Section updated successfully');
      closeEditModal();
      fetchSections();
    } catch (err) {
      console.error('Error updating section:', err);
      toast.error(`Failed to update section. ${err?.response?.data?.message || ''}`);
    }
  };

  const searchPlantName = (plantId) => {
    const plant = plants.find(p => p.id === plantId);
    return plant ? plant.name : 'Unknown Plant';
  }

  // Use hook for filter
  const { filteredData: filteredSections, FilterControls } = useStatusFilter(sections);

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Sections</h2>

      <FilterControls />

      <button
        onClick={openModal}
        className="mb-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
      >
        <i className="fas fa-plus"></i>
        Add New Section
      </button>

      <table className="w-full border border-gray-300 rounded-md overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-4 py-2 border-b border-gray-300">Name</th>
            <th className="text-left px-4 py-2 border-b border-gray-300">Plant</th>
            <th className="text-left px-4 py-2 border-b border-gray-300">Status</th>
            <th className="text-left px-4 py-2 border-b border-gray-300">Edit</th>
          </tr>
        </thead>
        <tbody>
          {filteredSections.length === 0 ? (
            <tr>
              <td className="text-center py-4 text-gray-500" colSpan={3}>
                No sections found.
              </td>
            </tr>
          ) : (
            filteredSections.map(({ id, name, plantId, status }) => (
              <tr key={id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b border-gray-300">{name}</td>
                <td className="px-4 py-2 border-b border-gray-300">{searchPlantName(plantId)}</td>
                <td className="px-4 py-2 border-b border-gray-300">
                  {status ? (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      Active
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 border-b border-gray-300">
                  <button
                    onClick={() => openEditModal({ id, name, status })}
                    className="text-blue-600 hover:underline"
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal Create */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Add New Section"
      >
        <h2 className="text-xl font-semibold mb-4">Add New Section</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="name">
              Section Name:
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Section name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="block mb-1 font-medium" htmlFor="plantId">
              Select Plant:
            </label>
            <select
              id="plantId"
              name="plantId"
              value={formData.plantId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a plant --</option>
              {plants.map(plant => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
            >
              <i className="fas fa-times"></i>
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              <i className="fas fa-check"></i>
              Add Section
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit */}
      <Modal
        isOpen={editModalIsOpen}
        onRequestClose={closeEditModal}
        style={customStyles}
        contentLabel="Edit Section"
      >
        <h2 className="text-xl font-semibold mb-4">Edit Section</h2>
        <form onSubmit={handleEditSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-name">
              Section Name:
            </label>
            <input
              id="edit-name"
              type="text"
              name="name"
              value={editFormData.name}
              onChange={handleEditChange}
              placeholder="Section name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <label htmlFor="edit-status" className="font-medium">
              Active Status:
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
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              <i className="fas fa-check"></i>
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SectionsTable;