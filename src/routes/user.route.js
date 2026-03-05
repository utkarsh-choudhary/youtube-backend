import { Router } from "express";
import { loginUSer, logoutUser, registerUser } from "../controllers/user.controller.js";
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


export default router; 




//  http://localhost:6000/api/v1/users/register