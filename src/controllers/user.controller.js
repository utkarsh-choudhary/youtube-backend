import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadFilePathOnCloudinary} from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessTokenAndRefreshToken = async (userId)=>{
    try {

        const user=await User.findById(userId)
       const accesstoken= user.generateAccessToken();
       const refreshToken= user.generateRefreshToken();
       user.refreshToken=refreshToken;
       await user.save({validateBeforeSave:false})
         return {accesstoken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access token and refresh token")
    }
}


const registerUser = asyncHandler(async (req, res)=>{
    // res.status(200).json({
    //     message:"User registered successfully!"
    // })

    // get the user details from frontend
    //validation -not empty
    //check if user already exists:username, email
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    //create user object - create entry in database
    //remove password and refresh token field from the response
    //check for user creation
    //return response

    const {username, email, fullName, password} = req.body;
    console.log("email", email);
    if([username, email, fullName, password].some((field)=> field?.trim()==="")){
        throw new ApiError(400, "All fields are required");
    }

    const existUser =await User.findOne({
        $or:[
            {username},
            {email}
        ]
    })
    if(existUser){
        throw new ApiError(409, "User already exists with this username or email");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;

    if(req.files &&Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath= req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadFilePathOnCloudinary(avatarLocalPath);
    const coverImage = await uploadFilePathOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar is required");
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || '',
    })


   const createdUser = await User.findById(user._id)
   .select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while creating user");
    }
    
   
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})


const loginUSer =asyncHandler(async (req, res)=>{
    //req.body -> data
    //username or email
    //find the user in database
    //password check
    //generate refresh token and access token 
    //tokens send through cookie and response

    const {username, email, password}=req.body;

    if(!username && !email){
        throw new ApiError(400, "Username or email is required");
    }

    // if(!(username || email)){
    //     throw new ApiError(400, "Username or email is required");
    // }

    const user=await User.findOne({
        $or:[
            {username}, {email}
        ]
    })

    if(!user){
        throw new ApiError(404, "User does not exist with this username or email");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid user credentials");
    }


    const {accesstoken, refreshToken}=await generateAccessTokenAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const options={
    httpOnly:true,
    secure:true
   }

   return res.status(200).cookie("refreshToken",refreshToken, options).cookie("accessToken", accesstoken, options).json(
    new ApiResponse(200, {
        user:loggedInUser, accesstoken, refreshToken,  
    },
    "User logged in successfully")
   )


})


const logoutUser =asyncHandler(async (req, res)=>{
        //get user id from req.user
        //  find the user in database

       await User.findByIdAndUpdate(req.user._id, {$set:{refreshToken:undefined}},{new:true})

       const options={
        httpOnly:true,
        secure:true
       }

       return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new ApiResponse(200, null, "User logged out successfully")
       )
    
})


const refreshAccessToken =asyncHandler(async (req, res)=>{
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized, refresh token is missing")
    }

   try {
    const decodedToken= jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
 
    const user=await User.findById(decodedToken?._id)
 
    if(!user){
     throw new ApiError(401, "Invalid refresh token, user not found")
    }
 
     if(incomingRefreshToken!==user.refreshToken){
         throw new ApiError(401, "refressh token is expired or used")
     }
 
     const {accesstoken, newRefreshToken}=await generateAccessTokenAndRefreshToken(user._id)
 
     const options={
         httpOnly:true,
         secure:true
     }
 
     return res.status(200).cookie("refreshToken", newRefreshToken, options).cookie("accessToken", accesstoken, options)
     .json(
         new ApiResponse(200, {accesstoken, refreshToken:newRefreshToken}, "Access token refreshed successfully")
     )
   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
   }

})


export { registerUser,loginUSer, logoutUser, refreshAccessToken}