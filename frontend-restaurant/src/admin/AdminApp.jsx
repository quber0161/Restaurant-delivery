/* eslint-disable no-unused-vars */
import React, { useContext, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Sidebar from "./components/Sidebar/Sidebar";
import Add from "./pages/Add/Add";
import List from "./pages/List/List";
import Orders from "./pages/Orders/Orders";
import Categories from "./pages/Categories/Categories";
import { ToastContainer } from "react-toastify";
import { StoreContext } from "../user/context/StoreContext";
import Extras from "./pages/Extras/Extras";

const AdminApp = () => {
  const url = "https://restaurant-delivery-ibjx.onrender.com";
  const { token, userRole } = useContext(StoreContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || userRole !== "admin") {
      navigate("/"); // Redirect non-admin users
    }
  }, [token, userRole, navigate]);

  return (
    <div className="admin-container">
      <ToastContainer />
      <Navbar />
      <hr />
      <div className="app-content">
        <Sidebar />
        <Routes>
          <Route path="/add" element={<Add url={url} />} />
          <Route path="/list" element={<List url={url} />} />
          <Route path="/orders" element={<Orders url={url} />} />
          <Route path="/categories" element={<Categories url={url} />} />
          <Route path="/extras" element={<Extras url={url} />}/>
        </Routes>
      </div>
    </div>
  );
};

export default AdminApp;
