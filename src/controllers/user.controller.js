import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadFilePathOnCloudinary} from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


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


const changecurrentPassword= asyncHandler(async (req, res)=>{
    const {oldPassword, newPassword, confirmPassword}=req.body;


    if(!newPassword == confirmPassword){
        throw new ApiError(400, "New password and confirm password do not match")
    }

    const user = await User.findById(req.user?._id);
   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(401, "Old password is incorrect")
    }

    user.password=newPassword;
    await user.save({validateBeforeSave:false});

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})

 const getCurrentUserDetails = asyncHandler(async (req, res)=>{
    return res.status(200).json(
        new ApiResponse(200, req.user, "User details fetched successfully")
    )
 })


 const updateUserDetails = asyncHandler(async (req, res)=>{
    const {fullName, email} =req.body;

    if(!fullName || !email){
        throw new ApiError(400, "Full name and email are required")
    }


    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email.toLowerCase()
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(200,user, "User details updated successfully")
    )
 })

 const updateAvatar = asyncHandler(async (req, res)=>{
    const avatarLocalPath=req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar image is required")
    }

   const avatar= await uploadFilePathOnCloudinary(avatarLocalPath)
   if(!avatar.url){
    throw new ApiError(500, "Failed to upload avatar image")
   }

   const user=User.findByIdAndUpdate(
    req.user._id,
    {
        $set:{
            avatar:avatar.url,
        }
    },
    {new: true}
   ).select('-password -refreshToken')

   return res.status(200).json(
    new ApiResponse(200, user, "Avatar updated successfully")
   )

 })


 const updateCoverImage=asyncHandler(async(req, res)=>{
    const coverImageLocalPath=req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image is required")
    }
    const coverImage=await uploadFilePathOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(500, "failed to upload cover image")
    }
   const user= User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
 })


 const  getUserChannelSubscriber= asyncHandler(async (req, res)=>{
   const {username}= req.params;

    if(!username?.trim()){
        throw new ApiError(400, "Username not found")
    }

    const channel= await User.aggregate([
        {
            $match:{
                username:username.toLowerCase()
            }
        },
        {
            $lookup:{
                from :"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from :"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers",
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{
                            $in:[req.user?_id: "$subscribers.subscriber"]
                        },
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
        $project:{
            fullName:1,
            username:1,
            subscribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
            }
        }
    ])

    if(channel?.length){
        throw new ApiError(404, "Channel does not exist")
    }

    return res.status(200).json(
        new ApiResponse(200,channel[0], "user channel fetched successfully")
    )
 })

    const getWatchHistory= asyncHandler(async(req, res)=>{

        const _id=new mongoose.Types.ObjectId(req.user._id)
        const user=User.aggregate([
            {
                $match:{
                    _id:_id 
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            fullName:1,
                                            username:1,
                                            avatar:1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first:"$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])


        return res.status(200).json(
            new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully")
        )
    })


export { 
    registerUser,
    loginUSer,
    logoutUser,
    refreshAccessToken,
    changecurrentPassword,
    getCurrentUserDetails,
    updateUserDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelSubscriber,
    getWatchHistory
}