/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { Navigate } from "react-router-dom";

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  
  
  const url = "https://restaurant-delivery-ibjx.onrender.com";
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [cartItems, setCartItems] = useState(() => {
    const savedGuestCart = localStorage.getItem("guestCart");
    return token
      ? {}
      : savedGuestCart
      ? JSON.parse(savedGuestCart)
      : {};
  });
  const [userRole, setUserRole] = useState(localStorage.getItem("role") || ""); // 🔹 Store user role
  const [food_list, setFoodList] = useState([]);
  const [category_list, setCategoryList] = useState([]);

  // Updated addToCart to store items as objects with quantity, extras, and comment
  const addToCart = async (itemId, extras = [], comment = "") => {
    const cartKey = `${itemId}_${btoa(JSON.stringify(extras))}_${btoa(comment)}`;
  
    // 🟢 Enrich extras with name and price
    const enrichedExtras = extras.map(extra => {
      if (extra.price && extra.name) return extra;
  
      const extraDetails = food_list.flatMap(f => f.extras || []).find(e => e._id === extra._id);
      return {
        _id: extra._id,
        name: extraDetails?.name || "Unknown Extra",
        price: extraDetails?.price || 0,
        quantity: extra.quantity || 1
      };
    });
  
    // 🧠 Construct the new cart state
    const updatedCart = {
      ...cartItems,
      [cartKey]: { itemId, quantity: 1, extras: enrichedExtras, comment }
    };
  
    setCartItems(updatedCart);
  
    // 🔐 Sync with backend if logged in
    if (token) {
      try {
        await axios.post(
          url + "/api/cart/add",
          { cartKey, itemId, extras: enrichedExtras, comment },
          { headers: { token } }
        );
      } catch (error) {
        console.error("Error adding to cart:", error);
      }
    } 
    
    if (!token) {
      setCartItems(prev => {
        const updatedCart = {
          ...prev,
          [cartKey]: { itemId, quantity: 1, extras: enrichedExtras, comment }
        };
        localStorage.setItem("guestCart", JSON.stringify(updatedCart));
        return updatedCart;
      });
    }
    
  };
  
  

  // Updated removeFromCart to work with the new structure
  const removeFromCart = async (cartKey) => {
    if (token) {
      // 🔐 Logged-in users - sync with backend
      try {
        const res = await axios.post(
          url + "/api/cart/remove",
          { cartKey },
          { headers: { token } }
        );
  
        if (res.data.success) {
          setCartItems(res.data.cartData);
        }
      } catch (error) {
        console.error("Error removing item from cart:", error);
      }
    } else {
      // 👤 Guest user - remove from local state
      setCartItems((prev) => {
        const updated = { ...prev };
        delete updated[cartKey];
        // 🧠 Optional: Save guest cart to localStorage
        localStorage.setItem("guestCart", JSON.stringify(updated));
        return updated;
      });
    }
  };
  

  // Calculate total cart amount
  const [totalCartAmount, setTotalCartAmount] = useState(0);

  const calculateTotalAmount = () => {
    // if (food_list.length === 0) {
    //   console.warn("⚠️ Food list is empty, skipping total calculation");
    //   return;
    // }
  
    let total = 0;
  
    Object.values(cartItems).forEach((cartItem) => {
      const foodItem = food_list.find((product) => product._id === cartItem.itemId);
  
      if (foodItem) {
        // 🟢 Ensure extras have valid price and quantity
        const extrasCost = (cartItem.extras || []).reduce((sum, extra) => {
          const extraDetails = food_list.flatMap(f => f.extras || []).find(e => e._id === extra._id);
          const extraPrice = extraDetails ? extraDetails.price : 0;
          return sum + (extraPrice * (extra.quantity || 1));
        }, 0);
  
        const itemTotal = (foodItem.price + extrasCost) * (cartItem.quantity || 1);
        total += itemTotal;
      }
    });
  
    setTotalCartAmount(total);
  };
  
  // 🔹 Ensure total is recalculated when cartItems *or* food_list are available
  useEffect(() => {
    if (food_list.length > 0) {
      calculateTotalAmount();
    }
  }, [cartItems, food_list]);
  
  useEffect(() => {
    if (!token) {
      localStorage.setItem("guestCart", JSON.stringify(cartItems));
    }
  }, [cartItems, token]);
  
  
  // 🟢 Function to get total cart amount
  const getTotalCartAmount = () => {
    return totalCartAmount;
  };



  const loadCartData = async (token) => {
  
    try {
      const response = await axios.post(url + "/api/cart/get", {}, { headers: { token } });
  
      if (response.data.success && response.data.cartData) {
  
        let transformedCart = {};
  
        // 🟢 Fetch extras list to get names & prices
        const extrasResponse = await axios.get(url + "/api/extras/list");
        const extrasMap = {};
        extrasResponse.data.extras.forEach((extra) => {
          extrasMap[extra._id] = extra; // Store extras by ID
        });
  
        Object.entries(response.data.cartData).forEach(([key, item]) => {
          transformedCart[key] = {
            itemId: item.itemId,
            quantity: item.quantity,
            extras: item.extras.map((extra) => ({
              _id: extra._id,
              name: extrasMap[extra._id]?.name || "Unknown Extra",
              price: extrasMap[extra._id]?.price || 0,
              quantity: extra.quantity || 1,
            })),
            comment: item.comment || "",
          };
        });
  
        setCartItems(transformedCart);
        calculateTotalAmount();
      } else {
        setCartItems({});
      }
    } catch (error) {
      console.error("❌ Error fetching cart:", error);
    }
  };
  
  

  const fetchCategories = async () => {
    const response = await axios.get(url + "/api/category/list");
    setCategoryList(response.data.categories);
  };

  const fetchFoodList = async () => {
    const response = await axios.get(url + "/api/food/list");
    setFoodList(response.data.data);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken("");
    setUserRole("");
    Navigate("/"); // Redirect to login after logout
  };

  useEffect(() => {
    async function loadData() {
      await fetchFoodList();
      await fetchCategories();
      if (token) {
        await loadCartData(token);
      } else {
        const savedCart = localStorage.getItem("guestCart");
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
      }
    }
    loadData();
  }, [token]);
  
  

  const contextValue = {
    food_list,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    getTotalCartAmount,
    url,
    token,
    setToken,
    category_list,
    userRole,
    setUserRole,
    logout,
    loadCartData
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
