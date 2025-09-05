import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./Navbar";
import ColorsTable from "./Colors";
import SectionsTable from "./Sections";
import PlantsTable from "./Plants";
import DataTable from "./Data";
import ColorOrderGame from "./ColorOrderGame";
import Login from "./Login";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="p-4">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/sections" element={<SectionsTable />} />
          <Route path="/plants" element={<PlantsTable />} />
          <Route path="/colors" element={<ColorsTable />}/>
          <Route path="/data" element={<DataTable />} />
          <Route path="/colorordergame" element={<ColorOrderGame />} />
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </div>
      {/* ToastContainer globally */}
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;