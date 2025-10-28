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

const InsulatorsTable = () => {
  const [insulators, setInsulators] = useState([]);
  const [createModalIsOpen, setCreateModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [editFormData, setEditFormData] = useState({
    id: null,
    name: '',
    status: false,
  });

  // Fetch insulators from backend
  const fetchInsulators = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/insulators`);
      setInsulators(res.data);
    } catch (err) {
      console.error('Error fetching insulators:', err);
    }
  };

  useEffect(() => {
    fetchInsulators();
  }, []);

  // Open and close create modal
  const openCreateModal = () => {
    setFormData({ name: '' });
    setCreateModalIsOpen(true);
  };
  const closeCreateModal = () => setCreateModalIsOpen(false);

  // Open and close edit modal
  const openEditModal = (insulator) => {
    setEditFormData({
      id: insulator.id,
      name: insulator.name,
      status: insulator.status || false,
    });
    setEditModalIsOpen(true);
  };
  const closeEditModal = () => setEditModalIsOpen(false);

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

    if (!formData.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API}/insulators`, formData);
      closeCreateModal();
      fetchInsulators();
    } catch (err) {
      console.error('Error creating insulator:', err);
      toast.error(`Failed to create insulator. ${err?.response?.data?.message || ''}`);
    }
  };

  // Submit edit form
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    try {
      await axios.put(`${import.meta.env.VITE_API}/insulators/${editFormData.id}`, {
        name: editFormData.name,
        status: editFormData.status,
      });
      closeEditModal();
      fetchInsulators();
    } catch (err) {
      console.error('Error updating insulator:', err);
      toast.error(`Failed to update insulator. ${err?.response?.data?.message || ''}`);
    }
  };

  // Use hook for filter
  const { filteredData: filteredInsulators, FilterControls } = useStatusFilter(insulators);

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Insulators</h2>

      <FilterControls />

      <button
        onClick={openCreateModal}
        className="mb-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
      >
        <i className="fas fa-plus"></i>
        Add New Insulator
      </button>

      <table className="w-full border border-gray-300 rounded-md overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left px-4 py-2 border-b border-gray-300">Name</th>
            <th className="text-center px-4 py-2 border-b border-gray-300">Status</th>
            <th className="text-center px-4 py-2 border-b border-gray-300">Edit</th>
          </tr>
        </thead>
        <tbody>
          {filteredInsulators.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-center py-4 text-gray-500">
                No insulators found.
              </td>
            </tr>
          ) : (
            filteredInsulators.map(({ id, name, status }) => (
              <tr key={id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b border-gray-300">{name}</td>
                <td className="px-4 py-2 border-b border-gray-300 text-center">
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
                <td className="px-4 py-2 border-b border-gray-300 text-center">
                  <button
                    onClick={() => openEditModal({ id, name, status })}
                    className="text-blue-600 hover:underline"
                    title="Edit Insulator"
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
        contentLabel="Add New Insulator"
      >
        <h2 className="text-xl font-semibold mb-4">Add New Insulator</h2>
        <form onSubmit={handleCreateSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="name">
              Name:
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleCreateChange}
              placeholder="Insulator Name"
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
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              <i className="fas fa-check"></i>
              Add Insulator
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalIsOpen}
        onRequestClose={closeEditModal}
        style={customStyles}
        contentLabel="Edit Insulator"
      >
        <h2 className="text-xl font-semibold mb-4">Edit Insulator</h2>
        <form onSubmit={handleEditSubmit}>
          <div className="mb-4">
            <label className="block mb-1 font-medium" htmlFor="edit-name">
              Name:
            </label>
            <input
              id="edit-name"
              type="text"
              name="name"
              value={editFormData.name}
              onChange={handleEditChange}
              placeholder="Insulator Name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status toggle */}
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

export default InsulatorsTable;