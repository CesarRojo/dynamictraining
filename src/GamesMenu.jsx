import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const GamesMenu = () => {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [minutes, setMinutes] = useState(2); // default 2 minutes
  const [seconds, setSeconds] = useState(0); // default 0 seconds
  const navigate = useNavigate();

  // Available games
  const games = [
    { name: 'Ordenar Color', path: '/colorordergame' },
    { name: 'Calibres', path: '/gaugesgame' },
  ];

  // Fetch plants
  const fetchPlants = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/plants`);
      setPlants(res.data);
    } catch (err) {
      console.error('Error fetching plants:', err);
      toast.error('Error al cargar plantas.');
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handlePlantChange = (e) => {
    setSelectedPlant(e.target.value);
    setSelectedGame('');
  };

  const handleGameChange = (e) => {
    setSelectedGame(e.target.value);
  };

  const handleStartGame = () => {
    if (!selectedPlant) {
      toast.error('Seleccione una planta.');
      return;
    }
    if (!selectedGame) {
      toast.error('Seleccione un juego.');
      return;
    }

    // Validate minutes and seconds
    if (
      minutes === '' ||
      seconds === '' ||
      isNaN(minutes) ||
      isNaN(seconds) ||
      minutes < 0 ||
      seconds < 0 ||
      seconds > 59
    ) {
      toast.error('Ingrese minutos o segundos validos (0-59 para segundos).');
      return;
    }

    const totalSeconds = Number(minutes) * 60 + Number(seconds);
    if (totalSeconds <= 0) {
      toast.error('El tiempo limite debe ser mayor a 0.');
      return;
    }

    const plantObj = plants.find(p => p.id.toString() === selectedPlant);
    const plantName = plantObj ? plantObj.name : '';

    const gameObj = games.find(g => g.path === selectedGame);
    const gameName = gameObj ? gameObj.name : '';

    sessionStorage.setItem('plantName', plantName);
    sessionStorage.setItem('gameName', gameName);

    navigate(selectedGame, { state: { plantName, timeLimit: totalSeconds } });
  };

  return (
    <div className="p-5 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Seleccione una planta y juego</h2>

      <div className="mb-6">
        <label htmlFor="plant-select" className="block mb-1 font-medium">
          Planta:
        </label>
        <select
          id="plant-select"
          value={selectedPlant}
          onChange={handlePlantChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Seleccione una planta --</option>
          {plants.map(plant => (
            <option key={plant.id} value={plant.id}>
              {plant.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label htmlFor="game-select" className="block mb-1 font-medium">
          Juego:
        </label>
        <select
          id="game-select"
          value={selectedGame}
          onChange={handleGameChange}
          disabled={!selectedPlant}
          className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
            selectedPlant ? 'border-gray-300 focus:ring-blue-500' : 'border-gray-200 bg-gray-100 cursor-not-allowed'
          }`}
        >
          <option value="">-- Seleccione un juego --</option>
          {games.map(game => (
            <option key={game.path} value={game.path}>
              {game.name}
            </option>
          ))}
        </select>
      </div>

      {/* Show inputs only if plant and game are selected */}
      {selectedPlant && selectedGame && (
        <div className="mb-6 flex items-center gap-4">
          <div className="flex flex-col">
            <label htmlFor="minutes" className="block mb-1 font-medium">
              Minutos
            </label>
            <input
              id="minutes"
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') setMinutes('');
                else {
                  const num = Number(val);
                  if (num >= 0 && num <= 59) setMinutes(num);
                }
              }}
              className="w-20 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="seconds" className="block mb-1 font-medium">
              Segundos
            </label>
            <input
              id="seconds"
              type="number"
              min="0"
              max="59"
              value={seconds}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') setSeconds('');
                else {
                  const num = Number(val);
                  if (num >= 0 && num <= 59) setSeconds(num);
                }
              }}
              className="w-20 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>
        </div>
      )}

      <button
        onClick={handleStartGame}
        disabled={
          !selectedPlant ||
          !selectedGame ||
          minutes === '' ||
          seconds === '' ||
          (Number(minutes) === 0 && Number(seconds) === 0)
        }
        className={`w-full px-4 py-2 rounded text-white ${
          selectedPlant &&
          selectedGame &&
          minutes !== '' &&
          seconds !== '' &&
          (Number(minutes) > 0 || Number(seconds) > 0)
            ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        Comenzar juego
      </button>
    </div>
  );
};

export default GamesMenu;