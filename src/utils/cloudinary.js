import { v2 as cloudinary } from "cloudinary";
import fs from "fs";



cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
}
)


const uploadFilePathOnCloudinary =async (localFilePath)=>{
    try {
      if(!localFilePath) return null;
      const response=await cloudinary.uploader.upload(localFilePath,{
        resource_type:"auto"
      })  
      //console.log("file uploaded on cloudinary successfully", response.url)
      fs.unlinkSync(localFilePath) //remove the locally stored file as we have successfully uploaded it on cloudinary and we don't need it anymore
      return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally stored file as the upload operation got failed
        console.log("error while uploading file on cloudinary", error)
        return null;
    }
}


export { uploadFilePathOnCloudinary }