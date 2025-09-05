import React, { useEffect, useState, useCallback, useReducer } from 'react';
import axios from 'axios';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const ItemTypes = {
  VALUE: 'value', // Define the drag item type for react-dnd
};

// Component representing draggable values outside the table (available values list)
const DraggableValue = ({ val, sectionId }) => {
  // Setup drag source with react-dnd
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.VALUE,
    item: { id: val.id, sectionId, from: 'list' }, // Data carried during drag
    collect: (monitor) => ({
      isDragging: monitor.isDragging(), // Track dragging state for UI feedback
    }),
  });

  return (
    <div
      ref={drag}
      className={`px-3 py-2 my-1 rounded cursor-grab select-none bg-gray-200 ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      {val.value}
    </div>
  );
};

// Component representing each droppable cell inside the table
// Cells accept drops and can be dragged if they contain a value
const DroppableValueCell = ({
  val,
  index,
  sectionId,
  moveValueInTable,
  assignValueToCell,
  originalColor,
  isCorrect,
}) => {
  const ref = React.useRef(null);

  // Setup drop target with react-dnd
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.VALUE,
    drop: (item) => {
      // Handle drop logic depending on drag source
      if (item.from === 'list') {
        // Assign value dragged from available list to this cell
        assignValueToCell(sectionId, index, item.id);
      } else if (item.from === 'table') {
        // Move value within the table if dropped on a different cell
        if (item.index !== index) {
          moveValueInTable(sectionId, item.index, index);
        }
      }
    },
    canDrop: (item) => item.sectionId === sectionId, // Only allow drops within the same section
    collect: (monitor) => ({
      isOver: monitor.isOver(), // Track if an item is hovered over this cell
      canDrop: monitor.canDrop(), // Track if the item can be dropped here
    }),
  });

  // Setup drag source for the cell if it contains a value
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.VALUE,
    item: { id: val?.id, index, sectionId, from: 'table' }, // Data carried during drag
    canDrag: !!val, // Only draggable if cell has a value
    collect: (monitor) => ({
      isDragging: monitor.isDragging(), // Track dragging state for UI feedback
    }),
  });

  // Connect drag and drop refs to the same DOM node
  drag(drop(ref));

  // Determine background color based on correctness and drag state
  let bgColorClass = 'bg-red-100'; // Default: incorrect (red)
  if (isCorrect) bgColorClass = 'bg-green-100'; // Correct (green)
  else if (isOver && canDrop) bgColorClass = 'bg-blue-100'; // Hovered and droppable (blue)

  return (
    <td
      ref={ref}
      className={`${bgColorClass} min-w-[100px] h-10 align-middle text-center font-bold select-none ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${val ? 'cursor-move' : canDrop ? 'cursor-pointer' : 'cursor-default'}`}
      title={val ? val.value : 'Drop value here'} // Tooltip for accessibility
    >
      {val ? val.value : ''}
    </td>
  );
};

// Initial state for the reducer managing available and table values by section
const initialState = {
  availableValuesBySection: {}, // Values not yet placed in the table
  tableValuesBySection: {}, // Values currently assigned to table cells
};

// Reducer function to handle state updates based on dispatched actions
function reducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE': {
      // Initialize state with available values and empty table slots per section
      return {
        availableValuesBySection: action.payload.availableValuesBySection,
        tableValuesBySection: action.payload.tableValuesBySection,
      };
    }
    case 'ASSIGN_VALUE_TO_CELL': {
      // Assign a value from available list to a specific cell in the table
      const { sectionId, cellIndex, valueId, dataEntries } = action.payload;

      // Copy current state to avoid mutations
      const newAvailable = { ...state.availableValuesBySection };
      const newTable = { ...state.tableValuesBySection };

      const oldVal = newTable[sectionId][cellIndex]; // Value currently in the cell (if any)

      // Remove the assigned value from available values
      newAvailable[sectionId] = newAvailable[sectionId].filter((v) => v.id !== valueId);

      // If the cell had a previous value, return it back to available values (avoid duplicates)
      if (oldVal) {
        if (!newAvailable[sectionId].some((v) => v.id === oldVal.id)) {
          newAvailable[sectionId] = [...newAvailable[sectionId], oldVal];
        }
      }

      // Update the table cell with the new value object
      newTable[sectionId] = [...newTable[sectionId]];
      const valObj = dataEntries.find((d) => d.id === valueId);
      newTable[sectionId][cellIndex] = valObj ? { id: valObj.id, value: valObj.value } : null;

      return {
        availableValuesBySection: newAvailable,
        tableValuesBySection: newTable,
      };
    }
    case 'MOVE_VALUE_IN_TABLE': {
      const { sectionId, fromIndex, toIndex } = action.payload;
      const newTable = { ...state.tableValuesBySection };
      const items = [...newTable[sectionId]];

      // Swap values
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
      return state; // Return current state if action type is unknown
  }
}

const ColorOrderGame = () => {
  // State for fetched data entries, colors, and sections
  const [dataEntries, setDataEntries] = useState([]);
  const [colors, setColors] = useState([]);
  const [sections, setSections] = useState([]);

  // Use reducer to manage available and table values grouped by section
  const [state, dispatch] = useReducer(reducer, initialState);
  const { availableValuesBySection, tableValuesBySection } = state;

  // Fetch data from API on component mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dataRes, colorsRes, sectionsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API}/data`),
          axios.get(`${import.meta.env.VITE_API}/colors`),
          axios.get(`${import.meta.env.VITE_API}/sections`),
        ]);
        setDataEntries(dataRes.data);
        setColors(colorsRes.data);
        setSections(sectionsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAll();
  }, []);

  // Initialize available values and empty table slots when dataEntries change
  useEffect(() => {
    if (dataEntries.length === 0) return;

    // Group data entries by sectionId
    const grouped = dataEntries.reduce((acc, entry) => {
      const sectionId = entry.section?.id || 'no-section';
      if (!acc[sectionId]) acc[sectionId] = [];
      acc[sectionId].push(entry);
      return acc;
    }, {});

    const newAvailable = {};
    const newTableValues = {};

    // For each section, shuffle available values and create empty table slots
    Object.entries(grouped).forEach(([sectionId, items]) => {
      const vals = items.map(({ id, value }) => ({ id, value }));
      newAvailable[sectionId] = shuffleArray(vals);
      newTableValues[sectionId] = new Array(vals.length).fill(null);
    });

    // Dispatch initialization action to reducer
    dispatch({
      type: 'INITIALIZE',
      payload: {
        availableValuesBySection: newAvailable,
        tableValuesBySection: newTableValues,
      },
    });
  }, [dataEntries]);

  // Utility function to shuffle an array (Fisher-Yates shuffle)
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Callback to move a value within the table (reorder)
  const moveValueInTable = useCallback((sectionId, fromIndex, toIndex) => {
    dispatch({
      type: 'MOVE_VALUE_IN_TABLE',
      payload: { sectionId, fromIndex, toIndex },
    });
  }, []);

  // Callback to assign a value from available list to a table cell
  const assignValueToCell = useCallback(
    (sectionId, cellIndex, valueId) => {
      dispatch({
        type: 'ASSIGN_VALUE_TO_CELL',
        payload: { sectionId, cellIndex, valueId, dataEntries },
      });
    },
    [dataEntries]
  );

  // Group data entries by section for rendering
  const groupedDataBySection = dataEntries.reduce((acc, entry) => {
    const sectionId = entry.section?.id || 'no-section';
    if (!acc[sectionId]) acc[sectionId] = [];
    acc[sectionId].push(entry);
    return acc;
  }, {});

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-5">
        <h2 className="text-2xl font-semibold mb-6">Arrange the values to match the correct color</h2>

        {/* Render UI for each section */}
        {sections.map(({ id: sectionId, name }) => {
          const originalItems = groupedDataBySection[sectionId] || [];
          const availableValues = availableValuesBySection[sectionId] || [];
          const tableValues = tableValuesBySection[sectionId] || [];

          // Show message if no data for this section
          if (originalItems.length === 0) {
            return (
              <div key={sectionId} className="mb-10">
                <h3 className="text-xl font-semibold mb-2">{name}</h3>
                <p className="italic text-gray-600">There is no data for this section.</p>
              </div>
            );
          }

          return (
            <div
              key={sectionId}
              className="mb-10 flex flex-col md:flex-row md:items-start md:gap-6"
            >
              {/* Available values list */}
              <p>{name}</p>
              <div className="md:w-48 mb-4 md:mb-0 border border-gray-300 rounded bg-gray-50 p-3 max-h-64 overflow-auto">
                <strong className="block mb-2">Available values:</strong>
                {availableValues.length === 0 ? (
                  <p className="italic text-gray-500">No available values</p>
                ) : (
                  availableValues.map((val) => (
                    <DraggableValue key={val.id} val={val} sectionId={sectionId} />
                  ))
                )}
              </div>

              {/* Table showing colors and droppable cells */}
              <div className="flex-1 overflow-x-auto">
                <table className="w-full border border-gray-300 rounded text-center table-fixed">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-300 py-2">Color</th>
                      <th className="border-b border-gray-300 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {originalItems.map((item, index) => {
                      const val = tableValues[index] || null;

                      // Determine if the value in the cell matches the correct color
                      const correctColorId = item.colorId;
                      const valColorId = val ? dataEntries.find((d) => d.id === val.id)?.colorId : null;
                      const isCorrect = valColorId === correctColorId;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          {/* Color circle */}
                          <td className="align-middle py-2">
                            <div
                              className="w-8 h-8 rounded-full border border-gray-300 mx-auto"
                              style={{ backgroundColor: item.color?.color || '#ccc' }}
                              title={item.color?.display || 'No color'}
                            />
                          </td>

                          {/* Droppable and draggable value cell */}
                          <DroppableValueCell
                            val={val}
                            index={index}
                            sectionId={sectionId}
                            moveValueInTable={moveValueInTable}
                            assignValueToCell={assignValueToCell}
                            originalColor={item.color?.color}
                            isCorrect={isCorrect}
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

export default ColorOrderGame;