// require("dotenv").config({path:"./.env"});
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";
dotenv.config({path:"./.env"});






const port = process.env.PORT || 6000;




connectDB()
.then(()=>{
    app.listen(port,()=>{
        console.log(`Server is running on port ${port}`);
    })
})
.catch((error)=>{
    console.log("Error in connecting to database",error);
})








/*
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
const app = express();


;(async()=>{
    try {
       await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
       app.on(("error"),(error)=>{
        console.log("app is unable to talk with database",error);
       })

       app.listen(process.env.PORT,()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
       })

    } catch (error) {
        console.log("Error in connecting to database",error);
        throw error;
    }
})()

*/