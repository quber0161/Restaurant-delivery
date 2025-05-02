/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import "./Categories.css";
import axios from "axios";
import { toast } from "react-toastify";
import { assets } from "../../assets/assets";

const Categories = () => {
  const url = "https://restaurant-delivery-ibjx.onrender.com";

  const [categories, setCategories] = useState([]);
  const [newCategoryImage, setNewCategoryImage] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: "" });

  // ✅ Fetch categories from the backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${url}/api/category/list`); // ✅ Fixed API URL
        if (response.data.success && Array.isArray(response.data.categories)) {
          setCategories(response.data.categories);
        } else {
          toast.error("Failed to load categories!");
          setCategories([]); // ✅ Prevent undefined issue
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Error fetching categories!");
        setCategories([]); // ✅ Prevent crash if API fails
      }
    };
    fetchCategories();
  }, []);

  // ✅ Handle Input Change
  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setNewCategory((data) => ({ ...data, [name]: value }));
  };

  // ✅ Add Category Function
  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (!newCategory.name.trim() || !newCategoryImage) {
      toast.error("Category name and image are required!");
      return;
    }

    const formData = new FormData();
    formData.append("name", newCategory.name);
    formData.append("image", newCategoryImage);

    try {
      const response = await axios.post(`${url}/api/category/add`, formData);
      if (response.data.success) {
        setCategories((prev) => [
          ...prev,
          {
            _id: response.data.id,
            name: newCategory.name,
            image: response.data.image,
          },
        ]);
        setNewCategory({ name: "" });
        setNewCategoryImage(null);
        toast.success("Category added successfully!");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Error adding category!");
    }
  };

  // ✅ Remove Category Function
  const removeCategory = async (categoryId) => {
    try {
      const response = await axios.post(`${url}/api/category/remove`, {
        id: categoryId,
      });
      if (response.data.success) {
        setCategories((prev) => prev.filter((cat) => cat._id !== categoryId)); // ✅ Remove from UI
        toast.success("Category removed successfully!");
      } else {
        toast.error("Error removing category!");
      }
    } catch (error) {
      console.error("Error removing category:", error);
      toast.error("Error removing category!");
    }
  };

  return (
    <div className="manage-categories">
      <h2>Manage Categories</h2>

      {/* ✅ Add Category Form */}
      <form onSubmit={onSubmitHandler}>
        <div className="add-category">
          <input
            onChange={onChangeHandler}
            type="text"
            name="name"
            placeholder="Enter new category"
            value={newCategory.name}
          />
          <label htmlFor="image">
            <img className="cat-img"
              src={
                newCategoryImage
                  ? URL.createObjectURL(newCategoryImage)
                  : assets.upload_area
              }
              alt=""
            />
          </label>
          <input
            onChange={(e) => setNewCategoryImage(e.target.files[0])}
            type="file"
            id="image"
            hidden
            required
          />
          <button type="submit">Add Category</button>
        </div>
      </form>

      {/* ✅ Display Categories */}
      <ul>
        {categories && categories.length > 0 ? (
          categories.map((cat) => (
            <li key={cat._id}>
              <img
                src={`${url}/categoryimages/` + cat.image}
                alt={cat.name}
                width="50"
                height="50"
              />
              {cat.name}
              <button onClick={() => removeCategory(cat._id)}>Remove</button>
            </li>
          ))
        ) : (
          <p>Loading categories...</p> // ✅ Prevents crashing if `categories` is empty
        )}
      </ul>
    </div>
  );
};

export default Categories;
