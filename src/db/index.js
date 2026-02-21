import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";




const connectDB = async () => {
    try {
       const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
       console.log(`\n Database connected successfully!! dbhost: ${connectionInstance.connection.host} \n`);
    } catch (error) {
        console.log("Error in connecting to database",error);
        process.exit(1);
    }

}


export default connectDB;