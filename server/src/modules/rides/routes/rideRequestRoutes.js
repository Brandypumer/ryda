import { Router } from 'express';

import { requireAuth } from '../../../shared/middleware/authMiddleware.js';
import { requireRole } from '../../../shared/middleware/roleGuard.js';
import {
  cancelRide,
  createRide,
  confirmDriver,
  declineDriver,
  getMyRides,
  getRide,
  getRideDriverProfile,
  retrySearch
} from '../controllers/rideRequestController.js';
import { createRideReview } from '../controllers/rideReviewController.js';

const rideRequestRouter = Router();

rideRequestRouter.post('/', requireAuth, requireRole('RIDER'), createRide);
rideRequestRouter.get('/my', requireAuth, requireRole('RIDER'), getMyRides);
rideRequestRouter.post('/:id/review', requireAuth, requireRole('RIDER'), createRideReview);
rideRequestRouter.get('/:id/driver-profile', requireAuth, requireRole('RIDER'), getRideDriverProfile);
rideRequestRouter.get('/:id', requireAuth, requireRole('RIDER'), getRide);
rideRequestRouter.patch('/:id/cancel', requireAuth, requireRole('RIDER'), cancelRide);
rideRequestRouter.post('/:id/confirm-driver', requireAuth, requireRole('RIDER'), confirmDriver);
rideRequestRouter.post('/:id/decline-driver', requireAuth, requireRole('RIDER'), declineDriver);
rideRequestRouter.post('/:id/retry-search', requireAuth, requireRole('RIDER'), retrySearch);

export default rideRequestRouter;
