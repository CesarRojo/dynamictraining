import React, { useEffect, useState, useCallback, useReducer, useMemo } from 'react';
import axios from 'axios';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const ItemTypes = {
  VALUE: 'value',
};

// Draggable cell for gauge or rings field
const DraggableValueCell = ({
  val,
  index,
  sectionId,
  field, // 'gauge' or 'rings'
  moveValueInTable,
  assignValueToCell,
  isCorrect,
}) => {
  const ref = React.useRef(null);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.VALUE,
    drop: (item) => {
      if (item.from === 'list') {
        assignValueToCell(sectionId, index, item.id, field);
      } else if (item.from === 'table') {
        if (item.index !== index || item.field !== field) {
          moveValueInTable(sectionId, item.index, index, item.field, field);
        }
      }
    },
    // Allow drop if same section and same field (gauge or rings)
    canDrop: (item) => item.sectionId === sectionId && item.field === field,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.VALUE,
    item: { id: val?.id, index, sectionId, from: 'table', field },
    canDrag: !!val,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  let bgColorClass = 'bg-red-100';
  if (isCorrect) bgColorClass = 'bg-green-100';
  else if (isOver && canDrop) bgColorClass = 'bg-blue-100';

  return (
    <td
      ref={ref}
      className={`${bgColorClass} min-w-[100px] h-10 align-middle text-center font-bold select-none ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${val ? 'cursor-move' : canDrop ? 'cursor-pointer' : 'cursor-default'}`}
      title={val ? val.value : 'Drop value here'}
    >
      {val ? val.value : ''}
    </td>
  );
};

// Select cell for features field
const FeaturesSelectCell = ({ val, index, sectionId, featureOptions, updateFeature }) => {
  const handleChange = (e) => {
    updateFeature(sectionId, index, e.target.value);
  };

  return (
    <td className="min-w-[150px] h-10 align-middle text-center select-none">
      <select
        className="w-full h-full px-2 border border-gray-300 rounded"
        value={val || ''}
        onChange={handleChange}
      >
        <option value="">Select feature</option>
        {featureOptions.map((feature) => (
          <option key={feature} value={feature}>
            {feature}
          </option>
        ))}
      </select>
    </td>
  );
};

// Initial state for reducer
const initialState = {
  availableValuesBySection: {}, // For gauge and rings fields separately
  tableValuesBySection: {}, // Array of objects per row: { insulatorType, gauge: {id, value}, rings: {id, value}, features: featureId }
};

// Reducer to handle drag-drop and feature updates
function reducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE': {
      return {
        availableValuesBySection: action.payload.availableValuesBySection,
        tableValuesBySection: action.payload.tableValuesBySection,
      };
    }
    case 'ASSIGN_VALUE_TO_CELL': {
      const { sectionId, cellIndex, valueId, field, gauges, insulatorType } = action.payload;

      const newAvailable = { ...state.availableValuesBySection };
      const newTable = { ...state.tableValuesBySection };

      // Remove assigned value from available for that field
      newAvailable[sectionId] = {
        ...newAvailable[sectionId],
        [field]: newAvailable[sectionId][field].filter((v) => v.id !== valueId),
      };

      // Return old value to available if exists
      const oldVal = newTable[sectionId][cellIndex][field];
      if (oldVal) {
        if (!newAvailable[sectionId][field].some((v) => v.id === oldVal.id)) {
          newAvailable[sectionId][field] = [...newAvailable[sectionId][field], oldVal];
        }
      }

      // Find new value object from gauges
      const valObj = gauges.find((g) => g.id === valueId);
      const newVal = valObj ? { id: valObj.id, value: valObj[field] } : null;

      // Update table cell field
      newTable[sectionId] = [...newTable[sectionId]];
      newTable[sectionId][cellIndex] = {
        ...newTable[sectionId][cellIndex],
        [field]: newVal,
      };

      return {
        availableValuesBySection: newAvailable,
        tableValuesBySection: newTable,
      };
    }
    case 'MOVE_VALUE_IN_TABLE': {
      const { sectionId, fromIndex, toIndex, fromField, toField } = action.payload;
      const newTable = { ...state.tableValuesBySection };
      const items = [...newTable[sectionId]];

      // Swap values only for the specified fields
      const temp = items[fromIndex][fromField];
      items[fromIndex] = { ...items[fromIndex], [fromField]: items[toIndex][toField] };
      items[toIndex] = { ...items[toIndex], [toField]: temp };

      newTable[sectionId] = items;
      return {
        ...state,
        tableValuesBySection: newTable,
      };
    }
    case 'UPDATE_FEATURE': {
      const { sectionId, cellIndex, featureId } = action.payload;
      const newTable = { ...state.tableValuesBySection };
      newTable[sectionId] = [...newTable[sectionId]];
      newTable[sectionId][cellIndex] = {
        ...newTable[sectionId][cellIndex],
        features: featureId,
      };
      return {
        ...state,
        tableValuesBySection: newTable,
      };
    }
    default:
      return state;
  }
}

const GaugesGame = () => {
  const [gauges, setGauges] = useState([]);
  const [insulators, setInsulators] = useState([]);
  const [sections, setSections] = useState([]);
  const location = useLocation();
  const plantName = location.state?.plantName || 'Unknown';
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(reducer, initialState);
  const { availableValuesBySection, tableValuesBySection } = state;
  
  // Modal state and clock input state
  const [modalOpen, setModalOpen] = useState(false);
  const [clockInput, setClockInput] = useState('');

  // normalize feature (handles null, arrays, comma-separated strings, casing)
  const normalizeFeature = (f) => {
    if (f == null) return '';
    if (Array.isArray(f)) return f.map(s => String(s).trim().toLowerCase()).sort().join(',');
    return String(f).trim().toLowerCase();
  };

  const isRowCorrect = (row, originalItems, insulatorMap) => {
    if (!row) return false;
    if (!row.gauge || !row.rings || !row.features) return false;

    const rowFeature = normalizeFeature(row.features);

    return originalItems.some(item => {
      const itemInsType = insulatorMap[item.insulatorId] || 'Unknown';
      const itemFeature = normalizeFeature(item.features);
      // strict match: same insulator type and matching triple
      return (
        itemInsType === row.insulatorType &&
        String(item.gauge) === String(row.gauge.value) &&
        String(item.rings) === String(row.rings.value) &&
        itemFeature === rowFeature
      );
    });
  };

  // Fetch gauges, insulators, and sections
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [gaugesRes, insulatorsRes, sectionsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API}/gauge`),
          axios.get(`${import.meta.env.VITE_API}/insulators`),
          axios.get(`${import.meta.env.VITE_API}/sections/plant`, { params: { plant: plantName } }),
        ]);
        setGauges(gaugesRes.data);
        setInsulators(insulatorsRes.data);
        setSections(sectionsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAll();
  }, [plantName]);

  // Map insulator id to name (insulator type)
  const insulatorMap = useMemo(() => {
    const map = {};
    insulators.forEach((ins) => {
      map[ins.id] = ins.name;
    });
    return map;
  }, [insulators]);

  // Unique features from gauges
  const uniqueFeatures = useMemo(() => {
    const featuresSet = new Set();
    gauges.forEach((g) => {
      if (g.features) featuresSet.add(g.features);
    });
    return Array.from(featuresSet);
  }, [gauges]);

  // Initialize available values and empty table slots when gauges change
  useEffect(() => {
    if (gauges.length === 0) return;

    // Group gauges by sectionId
    const grouped = gauges.reduce((acc, entry) => {
      const sectionId = entry.sectionId || 'no-section';
      if (!acc[sectionId]) acc[sectionId] = [];
      acc[sectionId].push(entry);
      return acc;
    }, {});

    const newAvailable = {};
    const newTableValues = {};

    Object.entries(grouped).forEach(([sectionId, items]) => {
      // For each field (gauge, rings), create available values list
      const gaugeVals = items.map(({ id, gauge, insulatorId }) => ({
        id,
        value: gauge,
        insulatorType: insulatorMap[insulatorId] || 'Unknown',
      }));
      const ringsVals = items.map(({ id, rings, insulatorId }) => ({
        id,
        value: rings,
        insulatorType: insulatorMap[insulatorId] || 'Unknown',
      }));

      newAvailable[sectionId] = {
        gauge: shuffleArray(gaugeVals),
        rings: shuffleArray(ringsVals),
      };

      // Initialize table rows with insulatorType and nulls for gauge and rings, and features as empty string
      newTableValues[sectionId] = items.map((item) => ({
        insulatorType: insulatorMap[item.insulatorId] || 'Unknown',
        gauge: null,
        rings: null,
        features: '',
      }));
    });

    dispatch({
      type: 'INITIALIZE',
      payload: {
        availableValuesBySection: newAvailable,
        tableValuesBySection: newTableValues,
      },
    });
  }, [gauges, insulatorMap]);

  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Move value in table (for gauge or rings)
  const moveValueInTable = useCallback((sectionId, fromIndex, toIndex, fromField, toField) => {
    dispatch({
      type: 'MOVE_VALUE_IN_TABLE',
      payload: { sectionId, fromIndex, toIndex, fromField, toField },
    });
  }, []);

  // Assign value from available list to table cell
  const assignValueToCell = useCallback(
    (sectionId, cellIndex, valueId, field) => {
      const insulatorType = tableValuesBySection[sectionId]?.[cellIndex]?.insulatorType || 'Unknown';

      dispatch({
        type: 'ASSIGN_VALUE_TO_CELL',
        payload: { sectionId, cellIndex, valueId, field, gauges, insulatorType },
      });
    },
    [gauges, tableValuesBySection]
  );

  // Update feature select value
  const updateFeature = useCallback((sectionId, cellIndex, featureId) => {
    dispatch({
      type: 'UPDATE_FEATURE',
      payload: { sectionId, cellIndex, featureId },
    });
  }, []);

  // Group gauges by section for rendering
  const groupedGaugesBySection = gauges.reduce((acc, entry) => {
    const sectionId = entry.sectionId || 'no-section';
    if (!acc[sectionId]) acc[sectionId] = [];
    acc[sectionId].push(entry);
    return acc;
  }, {});

  // replace existing isSectionComplete body with this:
  const isSectionComplete = (sectionId) => {
    const originalItems = groupedGaugesBySection[sectionId] || [];
    const tableValues = tableValuesBySection[sectionId] || [];

    if (tableValues.length === 0) return false;

    for (let i = 0; i < tableValues.length; i++) {
      const row = tableValues[i];
      if (!isRowCorrect(row, originalItems, insulatorMap)) return false;
    }
    return true;
  };

  const [completedSections, setCompletedSections] = useState({});
  const [allCompleted, setAllCompleted] = useState(false);

  useEffect(() => {
    if (sections.length === 0) return;

    const newCompletedSections = {};
    let allDone = true;

    sections.forEach(({ id: sectionId }) => {
      const originalItems = groupedGaugesBySection[sectionId] || [];
      if (originalItems.length === 0) {
        // Skip empty sections
        return;
      }

      const complete = isSectionComplete(sectionId);
      newCompletedSections[sectionId] = complete;
      if (!complete) allDone = false;
    });

    setCompletedSections(newCompletedSections);
    setAllCompleted(allDone);
  }, [tableValuesBySection, sections, gauges, insulatorMap]);

  // Handler to open modal
  const openModal = () => {
    setModalOpen(true);
  };

  // Handler to close modal
  const closeModal = () => {
    setModalOpen(false);
  };

  // Handler to submit player data
  const handleSubmitPlayer = async () => {
    const plant = sessionStorage.getItem('plantName') || 'Unknown';
    const game = sessionStorage.getItem('gameName') || 'Unknown';

    // Prepare completedSections array with section ids that are completed
    const completedSectionIds = Object.entries(completedSections)
      .filter(([_, completed]) => completed)
      .map(([sectionId]) => ({ sectionId: Number(sectionId) }));

    if (!clockInput.trim()) {
      toast.error('Please enter the clock value.');
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API}/players`, {
        clock: clockInput.trim(),
        plant,
        game,
        completedSections: completedSectionIds,
      });
      toast.success('Player saved successfully!');
      closeModal();
      navigate('/gamesmenu'); // Navigate back to games menu after saving
    } catch (error) {
      console.error(error);
      toast.error('Error saving player.');
    }
  };

  // Obtain array of completed sections with name and id
  const completedSectionsList = sections.filter(section => completedSections[section.id]);

  // Determine if there are any completed sections
  const hasCompletedSections = completedSectionsList.length > 0;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-5">
        <h2 className="text-2xl font-semibold mb-6 mr-4 inline">Arrange the gauges and rings, and select features</h2>

        {/* Button to open modal */}
        <button
          onClick={openModal}
          className={!hasCompletedSections ? "mb-6 px-4 py-2 bg-gray-300 text-white rounded" : "mb-6 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"}
          disabled={!hasCompletedSections} // Inable only if at least one section is completed
          title={!hasCompletedSections ? 'Complete at least one section to save' : ''}
        >
          <i className="mr-1 fa-solid fa-floppy-disk"></i>
          Save Player
        </button>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="bg-white rounded p-6 w-80 max-w-full">
              <h3 className="text-lg font-semibold mb-4">Save Player</h3>
              <div className="mb-4">
                <label htmlFor="clock" className="block mb-1 font-medium">
                  Clock
                </label>
                <input
                  id="clock"
                  type="text"
                  value={clockInput}
                  onChange={(e) => setClockInput(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter clock value"
                />
              </div>
              <div className="mb-4">
                <p>
                  <strong>Plant:</strong> {sessionStorage.getItem('plantName') || 'Unknown'}
                </p>
                <p>
                  <strong>Game:</strong> {sessionStorage.getItem('gameName') || 'Unknown'}
                </p>
              </div>

              {/* Mostrar secciones completadas */}
              <div className="mb-4">
                <strong>Completed Sections:</strong>
                {completedSectionsList.length === 0 ? (
                  <p className="italic text-gray-500">No sections completed yet.</p>
                ) : (
                  <ul className="list-disc list-inside max-h-32 overflow-auto mt-1">
                    {completedSectionsList.map((section) => (
                      <li key={section.id}>{section.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPlayer}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={!hasCompletedSections} // También deshabilitar aquí para seguridad
                  title={!hasCompletedSections ? 'Complete at least one section to save' : ''}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {allCompleted && (
          <div className="mb-6 p-4 bg-green-200 text-green-800 rounded font-semibold">
            You have successfully completed all sections! 🎉
          </div>
        )}

        {sections
         .filter(({ id }) => (groupedGaugesBySection[id] || []).length > 0)
         .map(({ id: sectionId, name }) => {
          const originalItems = groupedGaugesBySection[sectionId] || [];
          const availableValues = availableValuesBySection[sectionId] || { gauge: [], rings: [] };
          const tableValues = tableValuesBySection[sectionId] || [];

          if (originalItems.length === 0) {
            return (
              <div key={sectionId} className="mb-10">
                <h3 className="text-xl font-semibold mb-2">{name}</h3>
                <p className="italic text-gray-600">There is no data for this section.</p>
              </div>
            );
          }

          // Split into two halves for two tables
          const midIndex = Math.ceil(originalItems.length / 2);
          const firstHalf = originalItems.slice(0, midIndex);
          const secondHalf = originalItems.slice(midIndex);

          return (
            <div
              key={sectionId}
              className="mb-10 flex flex-col md:flex-row md:items-start md:gap-6"
            >
              <div className="mb-4 md:mb-0 md:w-48">
                <p className="text-lg font-semibold">{name}</p>
                {completedSections[sectionId] && (
                  <span className="text-green-600 font-bold">✔ Completed</span>
                )}

                {/* Available values for gauge and rings */}
                <div className="mt-3 border border-gray-300 rounded bg-gray-50 p-3 max-h-64 overflow-auto">
                  <strong className="block mb-2">Available Gauges:</strong>
                  {availableValues.gauge.length === 0 ? (
                    <p className="italic text-gray-500">No available gauges</p>
                  ) : (
                    availableValues.gauge.map((val) => (
                      <DraggableValue
                        key={val.id + '-gauge'}
                        val={val}
                        sectionId={sectionId}
                        field="gauge"
                        insulatorType={val.insulatorType}
                      />
                    ))
                  )}
                </div>
                <div className="mt-3 border border-gray-300 rounded bg-gray-50 p-3 max-h-64 overflow-auto">
                  <strong className="block mb-2">Available Rings:</strong>
                  {availableValues.rings.length === 0 ? (
                    <p className="italic text-gray-500">No available rings</p>
                  ) : (
                    availableValues.rings.map((val) => (
                      <DraggableValue
                        key={val.id + '-rings'}
                        val={val}
                        sectionId={sectionId}
                        field="rings"
                        insulatorType={val.insulatorType}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row md:gap-6 overflow-x-auto">
                {/* First table */}
                <table className="w-full md:w-1/2 border border-gray-300 rounded text-center table-fixed mb-6 md:mb-0">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '10%' }}>Insulator</th>
                      <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Gauge</th>
                      <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Rings</th>
                      <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Features</th>
                    </tr>
                  </thead>
                  <tbody>
                    {firstHalf.map((item, index) => {
                      const row = tableValues[index] || {
                        gauge: null,
                        rings: null,
                        features: '',
                        insulatorType: insulatorMap[item.insulatorId] || 'Unknown',
                      };

                      // Correctness: gauge and rings values exist for insulator type anywhere in original data
                      // const isGaugeCorrect = row.gauge
                      //   ? originalItems.some(
                      //       (orig) =>
                      //         insulatorMap[orig.insulatorId] === row.insulatorType &&
                      //         orig.gauge === row.gauge.value
                      //     )
                      //   : false;

                      // const isRingsCorrect = row.rings
                      //   ? originalItems.some(
                      //       (orig) =>
                      //         insulatorMap[orig.insulatorId] === row.insulatorType &&
                      //         orig.rings === row.rings.value
                      //     )
                      //   : false;

                      const rowIsCorrect = isRowCorrect(row, originalItems, insulatorMap);

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="align-middle py-2">{row.insulatorType}</td>
                          <DraggableValueCell
                            val={row.gauge}
                            index={index}
                            sectionId={sectionId}
                            field="gauge"
                            moveValueInTable={moveValueInTable}
                            assignValueToCell={assignValueToCell}
                            isCorrect={rowIsCorrect}
                          />
                          <DraggableValueCell
                            val={row.rings}
                            index={index}
                            sectionId={sectionId}
                            field="rings"
                            moveValueInTable={moveValueInTable}
                            assignValueToCell={assignValueToCell}
                            isCorrect={rowIsCorrect}
                          />
                          <FeaturesSelectCell
                            val={row.features}
                            index={index}
                            sectionId={sectionId}
                            featureOptions={uniqueFeatures}
                            updateFeature={updateFeature}
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Second table */}
                <table className="w-full md:w-1/2 border border-gray-300 rounded text-center table-fixed">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '10%' }}>Insulator</th>
                      <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Gauge</th>
                      <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Rings</th>
                      <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Features</th>
                    </tr>
                  </thead>
                  <tbody>
                    {secondHalf.map((item, index) => {
                      const row = tableValues[midIndex + index] || {
                        gauge: null,
                        rings: null,
                        features: '',
                        insulatorType: insulatorMap[item.insulatorId] || 'Unknown',
                      };

                      // const isGaugeCorrect = row.gauge
                      //   ? originalItems.some(
                      //       (orig) =>
                      //         insulatorMap[orig.insulatorId] === row.insulatorType &&
                      //         orig.gauge === row.gauge.value
                      //     )
                      //   : false;

                      // const isRingsCorrect = row.rings
                      //   ? originalItems.some(
                      //       (orig) =>
                      //         insulatorMap[orig.insulatorId] === row.insulatorType &&
                      //         orig.rings === row.rings.value
                      //     )
                      //   : false;

                        const rowIsCorrect = isRowCorrect(row, originalItems, insulatorMap);

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="align-middle py-2">{row.insulatorType}</td>
                          <DraggableValueCell
                            val={row.gauge}
                            index={midIndex + index}
                            sectionId={sectionId}
                            field="gauge"
                            moveValueInTable={moveValueInTable}
                            assignValueToCell={assignValueToCell}
                            isCorrect={rowIsCorrect}
                          />
                          <DraggableValueCell
                            val={row.rings}
                            index={midIndex + index}
                            sectionId={sectionId}
                            field="rings"
                            moveValueInTable={moveValueInTable}
                            assignValueToCell={assignValueToCell}
                            isCorrect={rowIsCorrect}
                          />
                          <FeaturesSelectCell
                            val={row.features}
                            index={midIndex + index}
                            sectionId={sectionId}
                            featureOptions={uniqueFeatures}
                            updateFeature={updateFeature}
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </DndProvider>
  );
};

// DraggableValue component updated to accept insulatorType prop for display (optional)
const DraggableValue = ({ val, sectionId, field, insulatorType }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.VALUE,
    item: { id: val.id, sectionId, from: 'list', field, insulatorType },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`px-3 py-2 my-1 rounded cursor-grab select-none bg-gray-200 ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
      title={insulatorType}
    >
      {val.value}
    </div>
  );
};

export default GaugesGame;