/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import "./Extras.css";
import axios from "axios";
import { toast } from "react-toastify";


const Extras = () => {
    
    const url = "https://restaurant-delivery-ibjx.onrender.com";
  const [extras, setExtras] = useState([]);
  const [newExtra, setNewExtra] = useState({ name: "", price: "" });

  // 🟢 Fetch all extras
  const fetchExtras = async () => {
    try {
      const response = await axios.get(`${url}/api/extras/list`);
      if (response.data.success) {
        setExtras(response.data.extras);
      } else {
        toast.error("Error fetching extras");
      }
    } catch (error) {
      console.error("Error fetching extras:", error);
    }
  };

  useEffect(() => {
    fetchExtras();
  }, []);

  // 🟢 Handle input changes
  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setNewExtra((prev) => ({ ...prev, [name]: value }));
  };

  // 🟢 Add a new extra ingredient
  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (!newExtra.name.trim() || !newExtra.price) {
      toast.error("Extra name and price are required!");
      return;
    }

    try {
      const response = await axios.post(`${url}/api/extras/add`, newExtra);
      if (response.data.success) {
        setExtras((prev) => [...prev, { ...newExtra, _id: response.data.id }]);
        setNewExtra({ name: "", price: "" });
        toast.success("Extra added successfully!");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error adding extra:", error);
      toast.error("Error adding extra ingredient");
    }
  };

  // 🟢 Remove an extra ingredient
  const removeExtra = async (extraId) => {
    try {
      const response = await axios.post(`${url}/api/extras/remove`, { id: extraId });
      if (response.data.success) {
        setExtras((prev) => prev.filter((extra) => extra._id !== extraId));
        toast.success("Extra removed successfully!");
      } else {
        toast.error("Error removing extra!");
      }
    } catch (error) {
      console.error("Error removing extra:", error);
      toast.error("Error removing extra ingredient!");
    }
  };

  return (
    <div className="manage-extras">
      <h2>Manage Extra Ingredients</h2>

      {/* 🟢 Add Extra Form */}
      <form onSubmit={onSubmitHandler}>
        <div className="add-extra">
          <input
            type="text"
            name="name"
            placeholder="Extra Ingredient Name"
            value={newExtra.name}
            onChange={onChangeHandler}
            required
          />
          <input
            type="number"
            name="price"
            placeholder="Price ($)"
            value={newExtra.price}
            onChange={onChangeHandler}
            required
          />
          <button type="submit">Add Extra</button>
        </div>
      </form>

      {/* 🟢 Display Extras */}
      <ul>
        {extras.length > 0 ? (
          extras.map((extra) => (
            <li className="ex-li" key={extra._id}>
              <p>{extra.name} - ${extra.price}</p>
              <button onClick={() => removeExtra(extra._id)}>Remove</button>
            </li>
          ))
        ) : (
          <p>Loading extra ingredients...</p>
        )}
      </ul>
    </div>
  );
};

export default Extras;
