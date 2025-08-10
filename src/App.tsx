import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/NavBar";
import CreateForm from "./components/CreateForm";
import DataList from "./components/DataList";

export default function App() {
  return (
    <Router basename="/Medical">
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Routes>
          <Route path="/" element={<CreateForm />} />
          <Route path="/list" element={<DataList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <ToastContainer />
    </Router>
  );
}