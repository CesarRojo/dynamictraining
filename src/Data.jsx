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

const DataTable = () => {
  const [dataEntries, setDataEntries] = useState([]);
  const [colors, setColors] = useState([]);
  const [sections, setSections] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    value: '',
    colorId: '',
    sectionId: '',
  });
  const [error, setError] = useState('');

  // Fetch data entries
  const fetchDataEntries = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/data`);
      setDataEntries(res.data);
    } catch (err) {
      console.error('Error fetching data entries:', err);
    }
  };

  // Fetch colors for select dropdown
  const fetchColors = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/colors`);
      setColors(res.data);
    } catch (err) {
      console.error('Error fetching colors:', err);
    }
  };

  // Fetch sections for select dropdown
  const fetchSections = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/sections`);
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

  const groupedData = dataEntries.reduce((acc, entry) => {
    const sectionName = entry.section?.name || 'No Section';
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(entry);
    return acc;
  }, {});

  // Open and close modal
  const openModal = () => {
    setFormData({ value: '', colorId: '', sectionId: '' });
    setError('');
    setModalIsOpen(true);
  };
  const closeModal = () => setModalIsOpen(false);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Submit form to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.value.trim() || !formData.colorId || !formData.sectionId) {
      setError('Value, color, and section are required.');
      return;
    }

    try {
      const payload = {
        value: formData.value.trim(),
        colorId: Number(formData.colorId),
        sectionId: Number(formData.sectionId),
      };
      await axios.post(`${import.meta.env.VITE_API}/data`, payload);
      closeModal();
      fetchDataEntries();
    } catch (err) {
      console.error('Error creating data entry:', err);
      setError(`Failed to create data entry. ${err?.response?.data?.message || ''}`);
    }
  };

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Data Entries</h2>
      <button
        onClick={openModal}
        className="mb-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
      >
        <i className="fas fa-plus"></i>
        Add New Data
      </button>

      <div className="flex flex-row gap-5 flex-wrap">
        {Object.entries(groupedData).map(([sectionName, entries]) => (
          <div key={sectionName} className="mb-10 w-full md:w-1/2 lg:w-1/3">
            <h3 className="text-lg font-semibold mb-3">Section: {sectionName}</h3>
            <table className="w-full border border-gray-300 rounded-md overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Value</th>
                  <th className="text-center px-4 py-2 border-b border-gray-300">Color</th>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Color Name</th>
                  <th className="text-left px-4 py-2 border-b border-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">No data entries found.</td>
                  </tr>
                ) : (
                  entries.map(({ id, value, color, status }) => (
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
                      <td className="px-4 py-2 border-b border-gray-300">{status ? 'Active' : 'Inactive'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Add New Data Entry"
      >
        <h2 className="text-xl font-semibold mb-4">Add New Data Entry</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="value">
              Value:
            </label>
            <input
              id="value"
              type="text"
              name="value"
              value={formData.value}
              onChange={handleChange}
              placeholder="Enter value"
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
              <option value="">-- Select Color --</option>
              {colors.map(({ id, display }) => (
                <option key={id} value={id}>{display}</option>
              ))}
            </select>
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
              Add Data
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DataTable;