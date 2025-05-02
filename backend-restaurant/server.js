import express from "express"
import cors from "cors"
import { connect } from "mongoose"
import { connectDB } from "./config/db.js"
import foodRouter from "./routes/foodRoute.js"
import userRouter from "./routes/userRoute.js"
import 'dotenv/config'
import cartRouter from "./routes/CartRoute.js"
import orderRouter from "./routes/orderRoute.js"
import categoryRouter from "./routes/categoryRoute.js"
import extraRouter from "./routes/extraRoute.js"

// ✅ NEW: Socket.io Setup
import { Server } from "socket.io"
import http from "http"


// app config
const app = express()
const port = 4000

// ✅ Create HTTP server for Socket.IO
const server = http.createServer(app)

// ✅ Setup Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "https://restaurant-delivery-eight.vercel.app", // or your frontend URL
        methods: ["GET", "POST"]
    }
})

// ✅ Handle connection events
io.on("connection", (socket) => {
    console.log("✅ Admin connected:", socket.id)
})

// ✅ Make io available in your controllers
app.set("io", io)


// middleware
app.use(express.json())
app.use(cors())

//db connection
connectDB();

// api endpoint 
app.use("/api/food", foodRouter)
app.use("/foodimages", express.static('uploads/foods'))
app.use("/api/user", userRouter)
app.use("/api/cart",cartRouter)
app.use("/api/order",orderRouter)
app.use("/api/category", categoryRouter)
app.use("/categoryimages", express.static('uploads/categories'))
app.use("/api/extras", extraRouter); // 🟢 Register Extra Ingredients API

app.get("/", (req, res) => {
    res.send("API Working")
})

// ✅ Use the HTTP server to listen instead of app.listen
server.listen(port, () => {
    console.log(`🚀 Server running athttps://restaurant-delivery-eight.vercel.app:${port}`)
})

// mongodb+srv://dilushan06:<db_password>@cluster0.xbo2f.mongodb.net/?