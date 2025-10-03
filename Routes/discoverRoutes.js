// routes/discoverRoutes.js
import express from 'express';
import { 
  toggleDiscover, 
  updateLocation,
  getNearbyUsersByLocation,
  verifyBluetoothProximity,
  updateDiscoverHeartbeat 
} from '../Controllers/discoverController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/toggle', authMiddleware, toggleDiscover);
router.post('/update-location', authMiddleware, updateLocation);
router.post('/nearby', authMiddleware, getNearbyUsersByLocation);
router.post('/verify-bluetooth', authMiddleware, verifyBluetoothProximity);
router.post('/heartbeat', authMiddleware, updateDiscoverHeartbeat);

export default router;