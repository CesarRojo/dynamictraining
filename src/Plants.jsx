import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';

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
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sectionId: '',
  });
  const [error, setError] = useState('');

  // Fetch plants from backend
  const fetchPlants = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/plants`);
      setPlants(res.data);
    } catch (err) {
      console.error('Error fetching plants:', err);
    }
  };

  // Fetch sections for the select dropdown
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

  // Open and close modal
  const openModal = () => {
    setFormData({ name: '', code: '', sectionId: '' });
    setError('');
    setModalIsOpen(true);
  };
  const closeModal = () => setModalIsOpen(false);

  // Handle changes in form inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Send form data to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.code.trim() || !formData.sectionId) {
      setError('Name, code and section are required.');
      return;
    }

    try {
      // sectionId should be a number
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        sectionId: Number(formData.sectionId),
      };
      await axios.post(`${import.meta.env.VITE_API}/plants`, payload);
      closeModal();
      fetchPlants();
    } catch (err) {
      console.error('Error creating plant:', err);
      setError(`Failed to create plant. ${err?.response?.data?.message || ''}`);
    }
  };

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Plants</h2>
      <button
        onClick={openModal}
        className="mb-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
      >
        <i className="fas fa-plus"></i>
        Add New Plant
      </button>

      <table className="w-full border border-gray-300 rounded-md overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-4 py-2 border-b border-gray-300">Name</th>
            <th className="text-left px-4 py-2 border-b border-gray-300">Code</th>
            <th className="text-left px-4 py-2 border-b border-gray-300">Section</th>
          </tr>
        </thead>
        <tbody>
          {plants.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-center py-4 text-gray-500">No plants found.</td>
            </tr>
          ) : (
            plants.map(({ id, name, code, section }) => (
              <tr key={id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b border-gray-300">{name}</td>
                <td className="px-4 py-2 border-b border-gray-300">{code}</td>
                <td className="px-4 py-2 border-b border-gray-300">{section?.name || 'N/A'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Add New Plant"
      >
        <h2 className="text-xl font-semibold mb-4">Add New Plant</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="name">
              Plant Name:
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Plant name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="code">
              Code:
            </label>
            <input
              id="code"
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Plant code"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="sectionId">
              Section:
            </label>
            <select
              id="sectionId"
              name="sectionId"
              value={formData.sectionId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Section --</option>
              {sections.map(({ id, name }) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-600 mb-4">{error}</p>}
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
              Add Plant
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PlantsTable;