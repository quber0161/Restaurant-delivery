import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import extraModel from "../models/extraModel.js";
import Stripe from "stripe";
import crypto from 'crypto';
import sendEmail from "../utils/sendEmail.js";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

//placing user order from front end
const placeOrder = async (req, res) => {
    const frontend_url = "https://restaurant-delivery-eight.vercel.app";

    try {
        const userId = req.userId;
        if (!userId) {
            return res.json({ success: false, message: "User not authenticated" });
        }

        if (!req.body.items || req.body.items.length === 0) {
            console.error("❌ Order Error: No items in order request.");
            return res.json({ success: false, message: "No items in order" });
        }

        let totalAmount = 0;
        const orderItems = req.body.items.map(item => {
            const extrasTotal = item.extras
                ? item.extras.reduce((acc, extra) => acc + (extra.price * extra.quantity || 0), 0)
                : 0;

            const itemTotal = ((item.price || 0) + extrasTotal) * (item.quantity || 1);
            totalAmount += itemTotal;

            return {
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                extras: item.extras.map(extra => ({
                    _id: extra._id,
                    name: extra.name,
                    quantity: extra.quantity
                })),
                comment: item.comment || ""
            };
        });

        if (isNaN(totalAmount) || totalAmount <= 0) {
            console.error("❌ Order Error: Invalid totalAmount", totalAmount);
            return res.json({ success: false, message: "Invalid total amount" });
        }

        const newOrder = new orderModel({
            userId: userId,
            items: orderItems,
            amount: totalAmount,
            address: req.body.address,
            date: req.body.date
        });

        await newOrder.save();
        await userModel.findByIdAndUpdate(userId, { cartData: {} });

        let line_items = [];
        req.body.items.forEach(item => {
            // const extrasTotal = item.extras
            //     ? item.extras.reduce((acc, extra) => acc + (extra.price * extra.quantity || 0), 0)
            //     : 0;

            // const totalItemPrice = (item.price || 0) + extrasTotal;

            line_items.push({
                price_data: {
                    currency: "nok",
                    product_data: { name: item.name || "Unknown Item" },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity || 1
            });

            item.extras.forEach(extra => {
                if (extra.price) {
                    line_items.push({
                        price_data: {
                            currency: "nok",
                            product_data: { name: `${item.name} - ${extra.name}` },
                            unit_amount: Math.round(extra.price * 100),
                        },
                        quantity: extra.quantity || 1
                    });
                }
            });
        });

        const session = await stripe.checkout.sessions.create({
            line_items,
            mode: 'payment',
            success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`
        });

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.error("❌ Error processing order:", error);
        res.json({ success: false, message: "Error processing order" });
    }
};





export const createGuestStripeCheckout = async (req, res) => {
  try {
    const { items, amount, address, email, date, deliveryType } = req.body;

    if (!email || !items || !address || !amount) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    let totalAmount = 0;

    const processedItems = items.map(item => {
      const extrasTotal = item.extras?.reduce((acc, extra) => acc + (extra.price * extra.quantity || 0), 0) || 0;
      const itemTotal = ((item.price || 0) + extrasTotal) * (item.quantity || 1);
      totalAmount += itemTotal;

      return {
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        extras: item.extras.map(extra => ({
          _id: extra._id,
          name: extra.name,
          quantity: extra.quantity,
          price: extra.price
        })),
        comment: item.comment || ""
      };
    });

    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid total amount" });
    }

    // Generate tracking token
    const trackingToken = crypto.randomBytes(16).toString("hex");

    // Save the order
    const newOrder = new orderModel({
      items: processedItems,
      amount: totalAmount,
      address,
      email,
      trackingToken,
      payment: false,
      date,
      deliveryType
    });

    await newOrder.save();

    // Stripe Line Items
    let line_items = [];

    items.forEach(item => {
    //   const extrasTotal = item.extras?.reduce((acc, extra) => acc + (extra.price * extra.quantity || 0), 0) || 0;
    //   const totalItemPrice = (item.price || 0) + extrasTotal;

      line_items.push({
        price_data: {
          currency: "nok",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity
      });

      item.extras?.forEach(extra => {
        if (extra.price ){
            line_items.push({
            price_data: {
                currency: "nok",
                product_data: { name: `${item.name} - ${extra.name}` },
                unit_amount: Math.round((extra.price || 0) * 100)
            },
            quantity: extra.quantity || 1
            });
        }
      });
    });

    const frontend_url = "https://restaurant-delivery-eight.vercel.app"; // update to production if needed

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: 'payment',
      success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}&guest=true`,
      cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}&guest=true`,
    });

    res.status(200).json({
      success: true,
      session_url: session.url
    });

  } catch (error) {
    console.error("❌ Guest Stripe Checkout Error:", error);
    res.status(500).json({ success: false, message: "Guest checkout failed" });
  }
};




const sendTrackingEmail = async (email, trackingLink) => {
    const subject = "Your Food Order Tracking Link";
    const text = `Thanks for ordering! You can track your order here: ${trackingLink}`;
    const html = `<p>Thanks for ordering!<br>You can track your order <a href="${trackingLink}">here</a>.</p>`;
  
    await sendEmail(email, subject, text, html);
};



const verifyOrder = async (req, res) => {
    const { orderId, success, guest } = req.body;

    try {
      if (success == "true") {
        const updatedOrder = await orderModel.findByIdAndUpdate(orderId, { payment: true }, { new: true });
  

        if (guest && updatedOrder?.email && updatedOrder?.trackingToken) {
          const trackingLink = `https://restaurant-delivery-eight.vercel.app/${updatedOrder.trackingToken}`;
          await sendTrackingEmail(updatedOrder.email, trackingLink);

          return res.json({
            success: true,
            message: "Paid",
            guestTrackingToken: updatedOrder.trackingToken
          });
        }
  
        res.json({ success: true, message: "Paid" });
      } else {
        await orderModel.findByIdAndDelete(orderId);
        res.json({ success: false, message: "Not Paid" });
      }
    } catch (error) {
      console.log(error);
      res.json({ success: false, message: "Error" });
    }
};
  

// GET /api/order/track/:token
export const trackGuestOrder = async (req, res) => {
    try {
      const { token } = req.params;
  
      const order = await orderModel
        .findOne({ trackingToken: token, payment: true })
        .populate("items.extras"); // 🟢 Populate extra ingredient details
  
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }
  
      res.status(200).json({ success: true, order });
    } catch (error) {
      console.error("❌ Error fetching guest order:", error);
      res.status(500).json({ success: false, message: "Error fetching order." });
    }
  };
  
  
  

  

// 🟢 Fetch all orders for the admin panel
const listOrders = async (req, res) => {
    try {
        const orders = await orderModel
            .find({ payment: true })
            .populate("items.extras"); // ✅ Populate extras with details

        res.json({ success: true, data: orders });
    } catch (error) {
        console.log("❌ Error fetching orders for admin:", error);
        res.json({ success: false, message: "Error fetching orders" });
    }
};




// 🟢 Fetch user-specific orders
const userOrders = async (req, res) => {
    try {
        const orders = await orderModel
            .find({ userId: req.userId, payment: true })
            .populate("items.extras"); // ✅ Populate extra ingredient details

        res.json({ success: true, data: orders });
    } catch (error) {
        console.log("❌ Error fetching user orders:", error);
        res.json({ success: false, message: "Error fetching orders" });
    }
};

const getLastOrder = async (req, res) => {
  try {
    const lastOrder = await orderModel.findOne({ userId: req.params.userId }).sort({ date: -1 });
    if (lastOrder) {
      res.status(200).json({ success: true, address: lastOrder.address });
    } else {
      res.status(404).json({ success: false, message: "No previous order found" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};




//api for order status update 
const updateStatus = async (req,res) => {
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId,{status:req.body.status})
        res.json({success:true,message:"Status Updated"})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:"Error"})
    }
}

export { placeOrder, verifyOrder, userOrders, listOrders,updateStatus, getLastOrder }