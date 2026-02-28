import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadFilePathOnCloudinary} from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js";



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

    const existUser =User.findOne({
        $or:[
            {username},
            {email}
        ]
    })
    if(existUser){
        throw new ApiError(409, "User already exists with this username or email");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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


export { registerUser}