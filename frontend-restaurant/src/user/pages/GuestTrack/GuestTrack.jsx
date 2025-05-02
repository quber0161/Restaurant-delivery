/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./GuestTrack.css";

const GuestTrack = () => {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStatusBackgroundColor = (status) => {
    switch (status) {
      case "Order Processing":
        return "#f8d7da";
      case "Ready to Takeaway":
        return "#fff3cd";
      case "Taken":
        return "#d4edda";
      default:
        return "#f8f9fa";
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(
          `https://restaurant-delivery-ibjx.onrender.com/api/order/track/${token}`
        );
        if (res.data.success) {
          setOrder(res.data.order);
        } else {
          alert(res.data.message || "Order not found.");
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        alert("An error occurred while fetching the order.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [token]);

  if (loading) return <div className="guest-track">Loading...</div>;
  if (!order) return <div className="guest-track">No order found.</div>;

  return (
    <div
      className="guest-track"
      style={{
        backgroundColor: getStatusBackgroundColor(order.status),
        padding: "20px",
        borderRadius: "10px",
      }}
    >
      <h2>Track Your Order</h2>

      <button className="track-btn" onClick={() => window.location.reload()}>
        Track Status
      </button>

      <p>
        <strong>Order Status:</strong> {order.status}
      </p>
      <p>
        <strong>Total:</strong> Kr {order.amount}
      </p>
      <p>
        <strong>Order Date:</strong> {new Date(order.date).toLocaleString()}
      </p>
      <h3>Items:</h3>
      <ul>
        {order.items.map((item, i) => (
          <li key={i}>
            {item.quantity}x {item.name} - Kr {item.price}
            {item.extras?.length > 0 && (
              <ul>
              {item.extras.map((extra, idx) => {
                const name = extra.name || "Extra";
                const price = extra.price || 0;
          
                return (
                  <li key={idx}>
                    {name} x {extra.quantity || 1} (+Kr {price * (extra.quantity || 1)})
                  </li>
                );
              })}
            </ul>
            )}
            {item.comment && <p>Note: {item.comment}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GuestTrack;
