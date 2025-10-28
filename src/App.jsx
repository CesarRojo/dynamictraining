import { AuthContext } from "./AuthContext";
import { useContext, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Login = lazy(() => import('./Login'));
const Navbar = lazy(() => import('./Navbar'));
const ColorsTable = lazy(() => import('./Colors'));
const SectionsTable = lazy(() => import('./Sections'));
const PlantsTable = lazy(() => import('./Plants'));
const DataTable = lazy(() => import('./Data'));
const ColorOrderGame = lazy(() => import('./ColorOrderGame'));
const GamesMenu = lazy(() => import('./GamesMenu'));
const InsulatorsTable = lazy(() => import('./Insulators'));
const GaugeTable = lazy(() => import('./Gauge'));
const GaugesGame = lazy(() => import('./GaugesGame'));

function App() {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      {user && <Navbar />}
        <Routes>
          <Route path="/" element={user ? <PlantsTable /> : <Login />} />
          <Route path="/sections" element={user ? <SectionsTable /> : <Navigate to="/" />} />
          <Route path="/plants" element={user ? <PlantsTable /> : <Navigate to="/" />} />
          <Route path="/colors" element={user ? <ColorsTable /> : <Navigate to="/" />}/>
          <Route path="/data" element={user ? <DataTable /> : <Navigate to="/" />} />
          <Route path="/colorordergame" element={<ColorOrderGame />} />
          <Route path="/gaugesgame" element={<GaugesGame />} />
          <Route path="/gamesmenu" element={<GamesMenu />} />
          <Route path="/insulators" element={user ? <InsulatorsTable /> : <Navigate to="/" />}/>
          <Route path="/gauges" element={user ? <GaugeTable /> : <Navigate to="/" />}/>
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      {/* ToastContainer globally */}
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;