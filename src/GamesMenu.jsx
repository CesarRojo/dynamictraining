import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const GamesMenu = () => {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const navigate = useNavigate();

  // Available games
  const games = [
    { name: 'Order Color', path: '/colorordergame' },
    { name: 'Gauges', path: '/gaugesgame' },
  ];

  // Fetch plants
  const fetchPlants = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API}/plants`);
      setPlants(res.data);
    } catch (err) {
      console.error('Error fetching plants:', err);
      toast.error('Error fetching plants.');
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  // Handle plant change
  const handlePlantChange = (e) => {
    setSelectedPlant(e.target.value);
    setSelectedGame(''); // reset game selection when plant changes
  };

  // Handle game change
  const handleGameChange = (e) => {
    const gamePath = e.target.value;
    setSelectedGame(gamePath);

    if (gamePath && selectedPlant) {
      // Search for the selected plant name
      const plantObj = plants.find(p => p.id.toString() === selectedPlant);
      const plantName = plantObj ? plantObj.name : '';

      // Get the game name from the path
      const gameObj = games.find(g => g.path === gamePath);
      const gameName = gameObj ? gameObj.name : '';

      // Save to sessionStorage
      sessionStorage.setItem('plantName', plantName);
      sessionStorage.setItem('gameName', gameName);

      // Navigate to the selected game with plant name as state
      navigate(gamePath, { state: { plantName } });
    }
  };

  return (
    <div className="p-5 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Select a plant and game</h2>

      <div className="mb-6">
        <label htmlFor="plant-select" className="block mb-1 font-medium">
          Plant:
        </label>
        <select
          id="plant-select"
          value={selectedPlant}
          onChange={handlePlantChange}
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

      <div className="mb-6">
        <label htmlFor="game-select" className="block mb-1 font-medium">
          Game:
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
          <option value="">-- Select a game --</option>
          {games.map(game => (
            <option key={game.path} value={game.path}>
              {game.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default GamesMenu;