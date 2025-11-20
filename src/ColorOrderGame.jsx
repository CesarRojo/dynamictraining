import React, {
  useEffect,
  useState,
  useCallback,
  useReducer,
  useRef,
  useMemo,
} from 'react';
import axios from 'axios';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const ItemTypes = {
  VALUE: 'value',
};

const DraggableValue = ({ val, sectionId, disabled }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.VALUE,
    item: { id: val.id, sectionId, from: 'list' },
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

const DroppableValueCell = ({
  val,
  index,
  sectionId,
  moveValueInTable,
  assignValueToCell,
  originalColor,
  isCorrect,
  disabled,
}) => {
  const ref = React.useRef(null);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.VALUE,
    drop: (item) => {
      if (disabled) return;

      if (item.from === 'list') {
        assignValueToCell(sectionId, index, item.id);
      } else if (item.from === 'table') {
        if (item.index !== index) {
          moveValueInTable(sectionId, item.index, index);
        }
      }
    },
    canDrop: (item) => !disabled && item.sectionId === sectionId,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.VALUE,
    item: { id: val?.id, index, sectionId, from: 'table' },
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
      } ${
        val
          ? disabled
            ? 'cursor-default'
            : 'cursor-move'
          : canDrop && !disabled
          ? 'cursor-pointer'
          : 'cursor-default'
      }`}
      title={val ? val.value : 'Drop value here'}
    >
      {val ? val.value : ''}
    </td>
  );
};

const initialState = {
  availableValuesBySection: {},
  tableValuesBySection: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE': {
      return {
        availableValuesBySection: action.payload.availableValuesBySection,
        tableValuesBySection: action.payload.tableValuesBySection,
      };
    }
    case 'ASSIGN_VALUE_TO_CELL': {
      const { sectionId, cellIndex, valueId, dataEntries } = action.payload;

      const newAvailable = { ...state.availableValuesBySection };
      const newTable = { ...state.tableValuesBySection };

      const oldVal = newTable[sectionId][cellIndex];

      newAvailable[sectionId] = newAvailable[sectionId].filter(
        (v) => v.id !== valueId
      );

      if (oldVal) {
        if (!newAvailable[sectionId].some((v) => v.id === oldVal.id)) {
          newAvailable[sectionId] = [...newAvailable[sectionId], oldVal];
        }
      }

      newTable[sectionId] = [...newTable[sectionId]];
      const valObj = dataEntries.find((d) => d.id === valueId);
      newTable[sectionId][cellIndex] = valObj
        ? { id: valObj.id, value: valObj.value }
        : null;

      return {
        availableValuesBySection: newAvailable,
        tableValuesBySection: newTable,
      };
    }
    case 'MOVE_VALUE_IN_TABLE': {
      const { sectionId, fromIndex, toIndex } = action.payload;
      const newTable = { ...state.tableValuesBySection };
      const items = [...newTable[sectionId]];

      const temp = items[fromIndex];
      items[fromIndex] = items[toIndex];
      items[toIndex] = temp;

      newTable[sectionId] = items;
      return {
        ...state,
        tableValuesBySection: newTable,
      };
    }
    default:
      return state;
  }
}

const ColorOrderGame = () => {
  const [dataEntries, setDataEntries] = useState([]);
  const [colors, setColors] = useState([]);
  const [sections, setSections] = useState([]);
  const location = useLocation();
  const plantName = location.state?.plantName || 'Unknown';
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(reducer, initialState);
  const { availableValuesBySection, tableValuesBySection } = state;

  const [modalOpen, setModalOpen] = useState(false);
  const [clockInput, setClockInput] = useState('');

  const timeLimit = location.state?.timeLimit || 120; // default 120 seconds
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [timeUp, setTimeUp] = useState(false);

  const [startModalOpen, setStartModalOpen] = useState(true);

  const isMounted = useRef(true);

  const gameStartTime = useRef(null);

  const [sectionCompletionTimes, setSectionCompletionTimes] = useState({});

  const audioRef = useRef(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dataRes, colorsRes, sectionsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API}/data`),
          axios.get(`${import.meta.env.VITE_API}/colors`),
          axios.get(`${import.meta.env.VITE_API}/sections/plant`, {
            params: { plant: plantName },
          }),
        ]);
        setDataEntries(dataRes.data);
        setColors(colorsRes.data);
        setSections(sectionsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAll();
  }, [plantName]);

  useEffect(() => {
    if (dataEntries.length === 0) return;

    const grouped = dataEntries.reduce((acc, entry) => {
      const sectionId = entry.section?.id || 'no-section';
      if (!acc[sectionId]) acc[sectionId] = [];
      acc[sectionId].push(entry);
      return acc;
    }, {});

    const newAvailable = {};
    const newTableValues = {};

    Object.entries(grouped).forEach(([sectionId, items]) => {
      const vals = items.map(({ id, value }) => ({ id, value }));
      newAvailable[sectionId] = shuffleArray(vals);
      newTableValues[sectionId] = new Array(vals.length).fill(null);
    });

    dispatch({
      type: 'INITIALIZE',
      payload: {
        availableValuesBySection: newAvailable,
        tableValuesBySection: newTableValues,
      },
    });
  }, [dataEntries]);

  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const moveValueInTable = useCallback((sectionId, fromIndex, toIndex) => {
    dispatch({
      type: 'MOVE_VALUE_IN_TABLE',
      payload: { sectionId, fromIndex, toIndex },
    });
  }, []);

  const assignValueToCell = useCallback(
    (sectionId, cellIndex, valueId) => {
      dispatch({
        type: 'ASSIGN_VALUE_TO_CELL',
        payload: { sectionId, cellIndex, valueId, dataEntries },
      });
    },
    [dataEntries]
  );

  const groupedDataBySection = useMemo(() => {
    return dataEntries.reduce((acc, entry) => {
      const sectionId = entry.section?.id || 'no-section';
      if (!acc[sectionId]) acc[sectionId] = [];
      acc[sectionId].push(entry);
      return acc;
    }, {});
  }, [dataEntries]);

  const displayedSections = useMemo(() => {
    return sections.filter(
      (section) => groupedDataBySection[section.id]?.length > 0
    );
  }, [sections, groupedDataBySection]);

  const [completedSections, setCompletedSections] = useState({});
  const [allCompleted, setAllCompleted] = useState(false);

  const isSectionComplete = (sectionId) => {
    const originalItems = groupedDataBySection[sectionId] || [];
    const tableValues = tableValuesBySection[sectionId] || [];

    if (tableValues.length === 0) return false;

    for (let i = 0; i < originalItems.length; i++) {
      const val = tableValues[i];
      if (!val) return false;
      const correctColorId = originalItems[i].colorId;
      const valColorId = dataEntries.find((d) => d.id === val.id)?.colorId;
      if (valColorId !== correctColorId) return false;
    }
    return true;
  };

  const countCorrectInSection = (sectionId) => {
    const originalItems = groupedDataBySection[sectionId] || [];
    const tableValues = tableValuesBySection[sectionId] || [];

    let correctCount = 0;

    for (let i = 0; i < originalItems.length; i++) {
      const val = tableValues[i];
      if (!val) continue;
      const correctColorId = originalItems[i].colorId;
      const valColorId = dataEntries.find((d) => d.id === val.id)?.colorId;
      if (valColorId === correctColorId) correctCount++;
    }

    return { correctCount };
  };

  useEffect(() => {
    if (displayedSections.length === 0) return;

    const newCompletedSections = {};
    let allDone = true;
    const newSectionCompletionTimes = { ...sectionCompletionTimes };

    displayedSections.forEach(({ id: sectionId }) => {
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
  }, [tableValuesBySection, displayedSections, dataEntries]);

  useEffect(() => {
    if (startModalOpen) return;

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

  const startGame = () => {
    setStartModalOpen(false);
    gameStartTime.current = Date.now();
    setTimeLeft(timeLimit);
    setTimeUp(false);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        console.warn('No se pudo reproducir la música automáticamente:', e);
      });
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
    }
  }, []);


  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSubmitPlayer = async () => {
    const plant = sessionStorage.getItem('plantName') || 'Unknown';
    const game = sessionStorage.getItem('gameName') || 'Unknown';

    const now = Date.now();
    const elapsedTime = Math.floor((now - gameStartTime.current) / 1000);

    const completedSectionData = displayedSections.map(({ id: sectionId }) => {
      const tableValues = tableValuesBySection[sectionId] || [];
      const hasAnyValue = tableValues.some((v) => v !== null);

      const { correctCount } = countCorrectInSection(sectionId);
      const totalCount = groupedDataBySection[sectionId]?.length || 0;

      let timeTakenSeconds = sectionCompletionTimes[sectionId]?.timeTaken;
      if (timeTakenSeconds === undefined) {
        timeTakenSeconds = timeUp ? timeLimit - timeLeft : elapsedTime;
      }

      return {
        sectionId,
        correctCount: `${hasAnyValue ? correctCount : 0} / ${totalCount}`,
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

  const completedSectionsList = displayedSections.map((section) => {
    const { id: sectionId, name } = section;
    const tableValues = tableValuesBySection[sectionId] || [];
    const hasAnyValue = tableValues.some((v) => v !== null);

    const { correctCount } = countCorrectInSection(sectionId);
    const totalCount = groupedDataBySection[sectionId]?.length || 0;

    let timeTaken = sectionCompletionTimes[sectionId]?.timeTaken;
    if (timeTaken === undefined) {
      timeTaken = timeUp
        ? timeLimit - timeLeft
        : Math.floor((Date.now() - gameStartTime.current) / 1000);
    }

    return {
      id: sectionId,
      name,
      correctCount: hasAnyValue ? correctCount : 0,
      totalCount,
      timeTaken,
    };
  });

  const canSave = timeUp || allCompleted;

  const totalItems = displayedSections.reduce((acc, section) => {
    return acc + (groupedDataBySection[section.id]?.length || 0);
  }, 0);

  let totalCorrect = 0;
  displayedSections.forEach(({ id: sectionId }) => {
    const originalItems = groupedDataBySection[sectionId] || [];
    const tableValues = tableValuesBySection[sectionId] || [];

    for (let i = 0; i < originalItems.length; i++) {
      const val = tableValues[i];
      if (!val) continue;
      const correctColorId = originalItems[i].colorId;
      const valColorId = dataEntries.find((d) => d.id === val.id)?.colorId;
      if (valColorId === correctColorId) totalCorrect++;
    }
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-5">
        {startModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4">
            <div className="bg-white rounded p-6 max-w-lg w-full text-center">
              <h2 className="text-2xl font-semibold mb-4">Cómo jugar</h2>
              <p className="mb-6 text-left">
                En este juego debes ordenar los valores arrastrándolos y soltándolos en la tabla correspondiente, asegurándote de que cada valor coincida con el color correcto. Puedes arrastrar valores desde la lista de valores disponibles hacia las celdas vacías, o reordenar los valores dentro de la tabla. Tienes un tiempo límite para completar todas las secciones. ¡Buena suerte!
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

        <audio
          ref={audioRef}
          // src="/music/pavidoNavido.mp3"
          src="/music/Puzzle-Clues.ogg"
          loop
          preload="auto"
        />

        <h2 className="text-2xl font-semibold mb-6 mr-4 inline">
          Ordena los valores con el color correcto
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
              {/* <li>
                Secciones con respuestas: <strong>{completedSectionsList.length}</strong> / {displayedSections.length}
              </li> */}
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
          title={
            !canSave
              ? 'Completa todas las secciones o espera a que termine el tiempo para guardar'
              : ''
          }
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
                  <strong>Planta:</strong> {sessionStorage.getItem('plantName') || 'Unknown'}
                </p>
                <p>
                  <strong>Juego:</strong> {sessionStorage.getItem('gameName') || 'Unknown'}
                </p>
              </div>

              <div className="mb-4">
                <strong>Secciones con respuestas:</strong>
                {completedSectionsList.length === 0 ? (
                  <p className="italic text-gray-500">Sin valores asignados aun.</p>
                ) : (
                  <ul className="list-disc list-inside max-h-48 overflow-auto mt-1">
                    {completedSectionsList.map((section) => (
                      <li key={section.id}>
                        {section.name} - Correctos: {section.correctCount} / {section.totalCount} - Tiempo:{' '}
                        {formatTime(section.timeTaken)}
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
                  title={
                    !canSave
                      ? 'Complete all sections or wait for time to finish to save'
                      : ''
                  }
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

        {displayedSections.map(({ id: sectionId, name }) => {
          const originalItems = groupedDataBySection[sectionId] || [];
          const availableValues = availableValuesBySection[sectionId] || [];
          const tableValues = tableValuesBySection[sectionId] || [];

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

                <div className="mt-3 border border-gray-300 rounded bg-gray-50 p-3 max-h-64 overflow-auto">
                  <strong className="block mb-2">Valores disponibles:</strong>
                  {availableValues.length === 0 ? (
                    <p className="italic text-gray-500">Sin valores disponibles</p>
                  ) : (
                    availableValues.map((val) => (
                      <DraggableValue
                        key={val.id}
                        val={val}
                        sectionId={sectionId}
                        disabled={timeUp}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row md:gap-6 overflow-x-auto">
                <table className="w-full md:w-1/2 border border-gray-300 rounded text-center table-fixed mb-6 md:mb-0">
                  <thead className="bg-gray-100">
                    <tr>
                      <th
                        className="border-b border-gray-300 py-2 text-xs"
                        style={{ width: '10%' }}
                      >
                        Color
                      </th>
                      <th
                        className="border-b border-gray-300 py-2 text-xs"
                        style={{ width: '90%' }}
                      >
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {firstHalf.map((item, index) => {
                      const val = tableValues[index] || null;

                      const correctColorId = item.colorId;
                      const valColorId = val
                        ? dataEntries.find((d) => d.id === val.id)?.colorId
                        : null;
                      const isCorrect = valColorId === correctColorId;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="align-middle py-2">
                            <div
                              className="w-6 h-6 rounded-full border border-gray-300 mx-auto"
                              style={{ backgroundColor: item.color?.color || '#ccc' }}
                              title={item.color?.display || 'No color'}
                            />
                          </td>
                          <DroppableValueCell
                            val={val}
                            index={index}
                            sectionId={sectionId}
                            moveValueInTable={moveValueInTable}
                            assignValueToCell={assignValueToCell}
                            originalColor={item.color?.color}
                            isCorrect={isCorrect}
                            disabled={timeUp}
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <table className="w-full md:w-1/2 border border-gray-300 rounded text-center table-fixed">
                  <thead className="bg-gray-100">
                    <tr>
                      <th
                        className="border-b border-gray-300 py-2 text-xs"
                        style={{ width: '10%' }}
                      >
                        Color
                      </th>
                      <th
                        className="border-b border-gray-300 py-2 text-xs"
                        style={{ width: '90%' }}
                      >
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {secondHalf.map((item, index) => {
                      const val = tableValues[midIndex + index] || null;

                      const correctColorId = item.colorId;
                      const valColorId = val
                        ? dataEntries.find((d) => d.id === val.id)?.colorId
                        : null;
                      const isCorrect = valColorId === correctColorId;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="align-middle py-2">
                            <div
                              className="w-6 h-6 rounded-full border border-gray-300 mx-auto"
                              style={{ backgroundColor: item.color?.color || '#ccc' }}
                              title={item.color?.display || 'No color'}
                            />
                          </td>
                          <DroppableValueCell
                            val={val}
                            index={midIndex + index}
                            sectionId={sectionId}
                            moveValueInTable={moveValueInTable}
                            assignValueToCell={assignValueToCell}
                            originalColor={item.color?.color}
                            isCorrect={isCorrect}
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

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default ColorOrderGame;