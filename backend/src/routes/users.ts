import { Router } from 'express';
import { UserPreferenceController } from '../controllers/UserPreferenceController';
import { authMiddleware } from '../middleware/auth';
import { validateUserPreferences } from '../middleware/validation';

const router = Router();
const userPreferenceController = new UserPreferenceController();

// User preferences routes
router.get('/preferences', 
  authMiddleware.authenticate, 
  userPreferenceController.getUserPreferences.bind(userPreferenceController)
);

router.put('/preferences', 
  authMiddleware.authenticate, 
  validateUserPreferences,
  userPreferenceController.updateUserPreferences.bind(userPreferenceController)
);

export default router;