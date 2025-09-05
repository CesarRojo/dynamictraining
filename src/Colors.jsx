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

const ColorsTable = () => {
  const [colors, setColors] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    color: '',
    display: '',
  });
  const [error, setError] = useState('');

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

  // Open and close modal
  const openModal = () => {
    setFormData({ color: '', display: '' });
    setError('');
    setModalIsOpen(true);
  };
  const closeModal = () => setModalIsOpen(false);

  // Validate hex color
  const isValidHex = (hex) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);

  // Handle changes in form inputs
  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Send form data to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.color || !formData.display) {
      setError('Both color and display are required.');
      return;
    }

    if (!isValidHex(formData.color)) {
      setError('Color must be a valid hexadecimal code (e.g. #FF0000).');
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API}/colors`, formData);
      closeModal();
      fetchColors();
    } catch (err) {
      console.error('Error creating color:', err);
      setError(`Failed to create color. ${err?.response?.data?.message || ''}`);
    }
  };

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Colors</h2>
      <button
        onClick={openModal}
        className="mb-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
      >
        <i className="fas fa-plus"></i>
        Add New Color
      </button>

      <table className="w-full border border-gray-300 rounded-md overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-center px-4 py-2 border-b border-gray-300">Color</th>
            <th className="text-left px-4 py-2 border-b border-gray-300">Name</th>
          </tr>
        </thead>
        <tbody>
          {colors.length === 0 ? (
            <tr>
              <td colSpan="2" className="text-center py-4 text-gray-500">No colors found.</td>
            </tr>
          ) : (
            colors.map(({ id, color, display }) => (
              <tr key={id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b border-gray-300 text-center">
                  <div
                    className="w-8 h-8 rounded-full border border-gray-300 mx-auto"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                </td>
                <td className="px-4 py-2 border-b border-gray-300">{display}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Add New Color"
      >
        <h2 className="text-xl font-semibold mb-4">Add New Color</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="colorPicker">
              Color Picker:
            </label>
            <input
              id="colorPicker"
              type="color"
              name="color"
              value={formData.color || '#ffffff'}
              onChange={handleChange}
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
              onChange={handleChange}
              placeholder="#FFFFFF"
              maxLength={7}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="display">
              Display Name:
            </label>
            <input
              id="display"
              type="text"
              name="display"
              value={formData.display}
              onChange={handleChange}
              placeholder="Red"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              Add Color
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ColorsTable;