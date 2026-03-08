import { Router } from "express";
import { changecurrentPassword, getCurrentUserDetails, getUserChannelSubscriber, getWatchHistory, loginUSer, logoutUser, registerUser, updateAvatar, updateCoverImage, updateUserDetails } from "../controllers/user.controller.js";
import { upload  } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { refreshAccessToken } from "../controllers/user.controller.js";


const router = Router();


router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ])
    ,registerUser)


router.route("/login").post(loginUSer)


router.route("/logout").post(verifyJwt, logoutUser)
router.route("/refreshtoken").post(refreshAccessToken)
router.route("change-password").post(verifyJwt, changecurrentPassword)
router.route("/current-user").get(verifyJwt,getCurrentUserDetails)
router.route("/update-profile").patch(verifyJwt, updateUserDetails)
router.route("/update-avatar").patch(verifyJwt,upload.single("avatar"), updateAvatar)
router.route("/update-cover-image").patch(verifyJwt,upload.single("coverImage"), updateCoverImage)
router.route("/channel/:username").get(verifyJwt, getUserChannelSubscriber)
router.route("/watch-history").get(verifyJwt,getWatchHistory)


export default router; 




//  http://localhost:6000/api/v1/users/register