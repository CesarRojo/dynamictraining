import React, { useEffect, useState, useCallback, useReducer, useMemo, useRef } from 'react';
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
  disabled,
}) => {
  const ref = React.useRef(null);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.VALUE,
    drop: (item) => {
      if (disabled) return;
      if (item.from === 'list') {
        assignValueToCell(sectionId, index, item.id, field);
      } else if (item.from === 'table') {
        if (item.index !== index || item.field !== field) {
          moveValueInTable(sectionId, item.index, index, item.field, field);
        }
      }
    },
    // Allow drop if same section and same field (gauge or rings)
    canDrop: (item) => !disabled && item.sectionId === sectionId && item.field === field,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.VALUE,
    item: { id: val?.id, index, sectionId, from: 'table', field },
    canDrag: !disabled && !!val,
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
      } ${val ? (disabled ? 'cursor-default' : 'cursor-move') : canDrop && !disabled ? 'cursor-pointer' : 'cursor-default'}`}
      title={val ? val.value : 'Drop value here'}
    >
      {val ? val.value : ''}
    </td>
  );
};

// Select cell for features field
const FeaturesSelectCell = ({ val, index, sectionId, featureOptions, updateFeature, disabled }) => {
  const handleChange = (e) => {
    if (disabled) return;
    updateFeature(sectionId, index, e.target.value);
  };

  return (
    <td className="min-w-[150px] h-10 align-middle text-center select-none">
      <select
        className="w-full h-full px-2 border border-gray-300 rounded"
        value={val || ''}
        onChange={handleChange}
        disabled={disabled}
      >
        <option value="">Selecciona caracteristica</option>
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
  const [completedSections, setCompletedSections] = useState({});
  const [allCompleted, setAllCompleted] = useState(false);
  const { availableValuesBySection, tableValuesBySection } = state;

  // Modal state and clock input state
  const [modalOpen, setModalOpen] = useState(false);
  const [clockInput, setClockInput] = useState('');

  // Time management states
  const timeLimit = location.state?.timeLimit || 120; // default 120 seconds
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [timeUp, setTimeUp] = useState(false);

  // Start modal state (added for music start)
  const [startModalOpen, setStartModalOpen] = useState(true);

  const isMounted = useRef(true);
  const gameStartTime = useRef(null);

  // Section completion times
  const [sectionCompletionTimes, setSectionCompletionTimes] = useState({});

  // Audio ref for background music
  const audioRef = useRef(null);

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
  const groupedGaugesBySection = useMemo(() => {
    return gauges.reduce((acc, entry) => {
      const sectionId = entry.sectionId || 'no-section';
      if (!acc[sectionId]) acc[sectionId] = [];
      acc[sectionId].push(entry);
      return acc;
    }, {});
  }, [gauges]);

  // Check if section is complete (all rows correct)
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

  // Section completion tracking with times
  useEffect(() => {
    if (sections.length === 0) return;

    const newCompletedSections = {};
    let allDone = true;
    const newSectionCompletionTimes = { ...sectionCompletionTimes };

    sections.forEach(({ id: sectionId }) => {
      const originalItems = groupedGaugesBySection[sectionId] || [];
      if (originalItems.length === 0) {
        // Skip empty sections
        return;
      }

      const complete = isSectionComplete(sectionId);
      newCompletedSections[sectionId] = complete;

      if (complete) {
        if (!newSectionCompletionTimes[sectionId]) {
          const now = Date.now();
          const timeTakenSeconds = Math.floor((now - gameStartTime.current) / 1000);
          newSectionCompletionTimes[sectionId] = {
            completedAt: now,
            timeTaken: timeTakenSeconds,
          };
        }
      } else {
        allDone = false;
      }
    });

    setCompletedSections(newCompletedSections);
    setAllCompleted(allDone);
    setSectionCompletionTimes(newSectionCompletionTimes);
  }, [tableValuesBySection, sections, groupedGaugesBySection]);

  // Time countdown effect
  useEffect(() => {
    if (startModalOpen) return; // don't start countdown until game started

    isMounted.current = true;
    if (timeLeft <= 0) {
      setTimeUp(true);
      return;
    }

    if (!timeUp) {
      const timerId = setTimeout(() => {
        if (isMounted.current) setTimeLeft(timeLeft - 1);
      }, 1000);

      return () => clearTimeout(timerId);
    }
    return undefined;
  }, [timeLeft, timeUp, startModalOpen]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Modal open/close handlers
  const openModal = () => {
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
  };

  // Start game handler
  const startGame = () => {
    setStartModalOpen(false);
    gameStartTime.current = Date.now();
    setTimeLeft(timeLimit);
    setTimeUp(false);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        console.warn('Could not autoplay music:', e);
      });
    }
  };

  // Set audio volume on mount
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
    }
  }, []);

  // Count correct in section (returns both correctCount and totalCount)
  const countCorrectInSection = (sectionId) => {
    const originalItems = groupedGaugesBySection[sectionId] || [];
    const tableValues = tableValuesBySection[sectionId] || [];

    let correctCount = 0;

    for (let i = 0; i < tableValues.length; i++) {
      const row = tableValues[i];
      if (!row) continue;
      if (isRowCorrect(row, originalItems, insulatorMap)) correctCount++;
    }

    return { correctCount, totalCount: originalItems.length };
  };

  // Submit player data handler
  const handleSubmitPlayer = async () => {
    const plant = sessionStorage.getItem('plantName') || 'Unknown';
    const game = sessionStorage.getItem('gameName') || 'Unknown';

    const now = Date.now();
    const elapsedTime = Math.floor((now - gameStartTime.current) / 1000);

    // Enviar solo las secciones que tienen datos y se muestran en el juego
    const displayedSections = sections.filter(({ id }) => (groupedGaugesBySection[id] || []).length > 0);

    const completedSectionData = displayedSections.map(({ id: sectionId, name }) => {
      const { correctCount, totalCount } = countCorrectInSection(sectionId);

      // Para tiempo tomado, si completó, usar tiempo guardado, si no, usar elapsedTime o tiempo restante
      let timeTakenSeconds = sectionCompletionTimes[sectionId]?.timeTaken;
      if (timeTakenSeconds === undefined) {
        timeTakenSeconds = timeUp ? timeLimit - timeLeft : elapsedTime;
      }

      return {
        sectionId,
        name,
        correctCount: `${correctCount} / ${totalCount}`,
        timeTaken: formatTime(timeTakenSeconds),
      };
    });

    if (!clockInput.trim()) {
      toast.error('Please enter the clock value.');
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API}/players`, {
        clock: clockInput.trim(),
        plant,
        game,
        completedSections: completedSectionData,
      });
      toast.success('Player saved successfully!');
      closeModal();
      navigate('/gamesmenu');
    } catch (error) {
      console.error(error);
      toast.error('Error saving player.');
    }
  };

  // Mostrar todas las secciones en el modal, con correctCount aunque sea 0
  const completedSectionsList = sections
    .filter((section) => (groupedGaugesBySection[section.id] || []).length > 0) // solo secciones con datos
    .map((section) => {
      const sectionId = section.id;

      // Prefer saved completion time; otherwise use a stable fallback.
      let timeTaken = sectionCompletionTimes[sectionId]?.timeTaken;
      if (timeTaken === undefined) {
        timeTaken = timeUp ? timeLimit - timeLeft : Math.floor((Date.now() - gameStartTime.current) / 1000);
      }

      const { correctCount, totalCount } = countCorrectInSection(sectionId);
      return {
        ...section,
        timeTaken,
        correctCount,
        totalCount,
      };
    });

  // Mantener la lógica del botón para guardar
  const canSave = timeUp || allCompleted;

  // Calcular total items y total correctos
  const totalItems = sections.reduce((acc, section) => {
    return acc + (groupedGaugesBySection[section.id]?.length || 0);
  }, 0);

  let totalCorrect = 0;
  sections.forEach(({ id: sectionId }) => {
    const originalItems = groupedGaugesBySection[sectionId] || [];
    const tableValues = tableValuesBySection[sectionId] || [];

    for (let i = 0; i < tableValues.length; i++) {
      const row = tableValues[i];
      if (!row) continue;
      if (isRowCorrect(row, originalItems, insulatorMap)) totalCorrect++;
    }
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-5">
        {/* Start modal */}
        {startModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4">
            <div className="bg-white rounded p-6 max-w-lg w-full text-center">
              <h2 className="text-2xl font-semibold mb-4">Como jugar</h2>
              <p className="mb-6 text-left">
                En este juego, debes ordenar los calibres y anillos arrastrándolos y soltándolos en las celdas correctas de la tabla, y seleccionar las caracteristicas adecuadas del menú desplegable. Tienes un límite de tiempo para completar todas las secciones. ¡Buena suerte!
              </p>
              <button
                onClick={startGame}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Comenzar
              </button>
            </div>
          </div>
        )}

        {/* Background music */}
        <audio
          ref={audioRef}
          src="/music/Puzzle-Clues.ogg"
          loop
          preload="auto"
        />

        <h2 className="text-2xl font-semibold mb-6 mr-4 inline">
          Ordena los calibres y anillos, y selecciona las caracteristicas
        </h2>

        <div className="mb-4 text-lg font-semibold">
          Tiempo restante:{' '}
          {Math.floor(timeLeft / 60)
            .toString()
            .padStart(2, '0')}
          :{(timeLeft % 60).toString().padStart(2, '0')}
        </div>

        {timeUp && (
          <div className="mb-6 p-4 bg-red-200 text-red-800 rounded font-semibold">
            Se acabo el tiempo! Ya no puedes hacer cambios. Aqui estan tus resultados:
            <ul className="list-disc list-inside mt-2">
              <li>
                Respuestas correctas: <strong>{totalCorrect}</strong> / {totalItems}
              </li>
            </ul>
          </div>
        )}

        <button
          onClick={openModal}
          className={
            !canSave
              ? 'mb-6 px-4 py-2 bg-gray-300 text-white rounded cursor-not-allowed'
              : 'mb-6 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700'
          }
          disabled={!canSave}
          title={!canSave ? 'Completa todas las secciones o espera a que termine el tiempo para guardar' : ''}
        >
          <i className="mr-1 fa-solid fa-floppy-disk"></i>
          Guardar jugador
        </button>

        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="bg-white rounded p-6 w-80 max-w-full">
              <h3 className="text-lg font-semibold mb-4">Guardar jugador</h3>
              <div className="mb-4">
                <label htmlFor="clock" className="block mb-1 font-medium">
                  Reloj
                </label>
                <input
                  id="clock"
                  type="text"
                  value={clockInput}
                  onChange={(e) => setClockInput(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Ingrese reloj"
                  // disabled={timeUp}
                />
              </div>
              <div className="mb-4">
                <p>
                  <strong>Planta:</strong> {sessionStorage.getItem('plantName') || 'Desconocida'}
                </p>
                <p>
                  <strong>Juego:</strong> {sessionStorage.getItem('gameName') || 'Desconocido'}
                </p>
              </div>

              <div className="mb-4">
                <strong>Secciones completadas:</strong>
                {completedSectionsList.length === 0 ? (
                  <p className="italic text-gray-500">Sin secciones completadas aun.</p>
                ) : (
                  <ul className="list-disc list-inside max-h-48 overflow-auto mt-1">
                    {completedSectionsList.map((section) => (
                      <li key={section.id}>
                        {section.name} - Correctos: {section.correctCount} / {section.totalCount} - Tiempo: {formatTime(section.timeTaken)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitPlayer}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={!canSave}
                  title={!canSave ? 'Completa todas las secciones o espera a que termine el tiempo para guardar' : ''}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {allCompleted && !timeUp && (
          <div className="mb-6 p-4 bg-green-200 text-green-800 rounded font-semibold">
            Has completado exitosamente todas las secciones! 🎉
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
                  <p className="italic text-gray-600">No hay datos para esta seccion.</p>
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
                    <span className="text-green-600 font-bold">✔ Completado</span>
                  )}

                  {/* Available values for gauge and rings */}
                  <div className="mt-3 border border-gray-300 rounded bg-gray-50 p-3 max-h-64 overflow-auto">
                    <strong className="block mb-2">Calibres disponibles:</strong>
                    {availableValues.gauge.length === 0 ? (
                      <p className="italic text-gray-500">Sin calibres disponibles</p>
                    ) : (
                      availableValues.gauge.map((val) => (
                        <DraggableValue
                          key={val.id + '-gauge'}
                          val={val}
                          sectionId={sectionId}
                          field="gauge"
                          insulatorType={val.insulatorType}
                          disabled={timeUp}
                        />
                      ))
                    )}
                  </div>
                  <div className="mt-3 border border-gray-300 rounded bg-gray-50 p-3 max-h-64 overflow-auto">
                    <strong className="block mb-2">Anillos disponibles:</strong>
                    {availableValues.rings.length === 0 ? (
                      <p className="italic text-gray-500">Sin anillos disponibles</p>
                    ) : (
                      availableValues.rings.map((val) => (
                        <DraggableValue
                          key={val.id + '-rings'}
                          val={val}
                          sectionId={sectionId}
                          field="rings"
                          insulatorType={val.insulatorType}
                          disabled={timeUp}
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
                        <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '10%' }}>Aislante</th>
                        <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Calibre</th>
                        <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Anillos</th>
                        <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Caracteristicas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {firstHalf.map((item, index) => {
                        const row = tableValues[index] || {
                          gauge: null,
                          rings: null,
                          features: '',
                          insulatorType: insulatorMap[item.insulatorId] || 'Desconocido',
                        };

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
                              disabled={timeUp}
                            />
                            <DraggableValueCell
                              val={row.rings}
                              index={index}
                              sectionId={sectionId}
                              field="rings"
                              moveValueInTable={moveValueInTable}
                              assignValueToCell={assignValueToCell}
                              isCorrect={rowIsCorrect}
                              disabled={timeUp}
                            />
                            <FeaturesSelectCell
                              val={row.features}
                              index={index}
                              sectionId={sectionId}
                              featureOptions={uniqueFeatures}
                              updateFeature={updateFeature}
                              disabled={timeUp}
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
                        <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '10%' }}>Aislante</th>
                        <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Calibre</th>
                        <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Anillos</th>
                        <th className="border-b border-gray-300 py-2 text-xs" style={{ width: '30%' }}>Caracteristicas</th>
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
                              disabled={timeUp}
                            />
                            <DraggableValueCell
                              val={row.rings}
                              index={midIndex + index}
                              sectionId={sectionId}
                              field="rings"
                              moveValueInTable={moveValueInTable}
                              assignValueToCell={assignValueToCell}
                              isCorrect={rowIsCorrect}
                              disabled={timeUp}
                            />
                            <FeaturesSelectCell
                              val={row.features}
                              index={midIndex + index}
                              sectionId={sectionId}
                              featureOptions={uniqueFeatures}
                              updateFeature={updateFeature}
                              disabled={timeUp}
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
const DraggableValue = ({ val, sectionId, field, insulatorType, disabled }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.VALUE,
    item: { id: val.id, sectionId, from: 'list', field, insulatorType },
    canDrag: !disabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`px-3 py-2 my-1 rounded cursor-grab select-none bg-gray-200 ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      {val.value}
    </div>
  );
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default GaugesGame;