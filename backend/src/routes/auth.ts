import express from "express";
import { authController } from "../controllers/AuthController";
import { authMiddleware } from "../middleware/auth";
import { RateLimiter } from "../middleware/rateLimiter";
import { SessionManager } from "../middleware/session";
import { validate, sanitizeInput } from "../middleware/validation";
import { auditMiddleware } from "../middleware/auditLogger";

const router = express.Router();

router.use(SessionManager.middleware);
router.use(sanitizeInput);

router.post("/register", 
  RateLimiter.authLimiter, 
  validate.userRegistration(),
  auditMiddleware.userRegister(),
  authController.register
);

router.post("/login", 
  RateLimiter.authLimiter, 
  validate.userLogin(),
  auditMiddleware.userLogin(),
  authController.login
);

router.post("/refresh", 
  RateLimiter.strictLimiter, 
  authController.refreshToken
);

router.post("/logout", 
  authMiddleware.authenticate, 
  auditMiddleware.userLogout(),
  authController.logout
);

router.get("/profile", 
  authMiddleware.authenticate, 
  auditMiddleware.userView(),
  authController.getProfile
);

router.put("/profile", 
  authMiddleware.authenticate, 
  validate.userRegistration(),
  auditMiddleware.userUpdate(),
  authController.updateProfile
);

export default router;