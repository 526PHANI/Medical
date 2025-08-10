import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/NavBar";
import CreateForm from "./components/CreateForm";
import DataList from "./components/DataList";

export default function App() {
  return (
    <Router>
      <Navbar />
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<CreateForm />} />
          <Route path="/list" element={<DataList />} />
        </Routes>
      </div>
      <ToastContainer />
    </Router>
  );
}