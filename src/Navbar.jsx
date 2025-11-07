import { NavLink } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { useContext, useState, useRef, useEffect } from "react";

function Navbar() {
  const { logout, user } = useContext(AuthContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
      isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-100"
    }`;

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white shadow-md p-4 flex items-center gap-4">
      <NavLink to="/plants" className={linkClass}>
        <i className="fas fa-city"></i>
        Plants
      </NavLink>
      <NavLink to="/sections" className={linkClass}>
        <i className="fas fa-location-dot"></i>
        Sections
      </NavLink>
      <NavLink to="/colors" className={linkClass}>
        <i className="fas fa-palette"></i>
        Colors
      </NavLink>
      <NavLink to="/data" className={linkClass}>
        <i className="fas fa-table"></i>
        Data
      </NavLink>
      <NavLink to="/insulators" className={linkClass}>
        <i className="fas fa-bolt"></i>
        Insulators
      </NavLink>
      <NavLink to="/gauges" className={linkClass}>
        <i className="fas fa-plug"></i>
        Gauges
      </NavLink>
      <NavLink to="/players" className={linkClass}>
        <i className="fa-solid fa-users"></i>
        Players
      </NavLink>
      <NavLink to="/gamesmenu" className={linkClass}>
        <i className="fas fa-gamepad"></i>
        Games
      </NavLink>

      {/* Spacer */}
      <div className="flex-grow"></div>

      {/* Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
        >
          <i className="fas fa-user-circle text-xl"></i>
          <span className="hidden sm:inline">{user?.email || "User"}</span>
          <svg
            className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <button
              onClick={() => {
                logout();
                setDropdownOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-red-600 hover:text-white transition"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;