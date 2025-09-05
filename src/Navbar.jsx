import { NavLink } from "react-router-dom";

function Navbar() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
      isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-100"
    }`;

  return (
    <nav className="bg-white shadow-md p-4 flex gap-4">
      <NavLink to="/sections" className={linkClass}>
        <i className="fas fa-location-dot"></i>
        Sections
      </NavLink>
      <NavLink to="/plants" className={linkClass}>
        <i className="fas fa-city"></i>
        Plants
      </NavLink>
      <NavLink to="/colors" className={linkClass}>
        <i className="fas fa-palette"></i>
        Colors
      </NavLink>
      <NavLink to="/data" className={linkClass}>
        <i className="fas fa-table"></i>
        Data
      </NavLink>
      <NavLink to="/colorordergame" className={linkClass}>
        <i className="fas fa-gamepad"></i>
        Color Order Game
      </NavLink>
    </nav>
  );
}

export default Navbar;