import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/authMiddleware.js';
import { requireRole } from '../../shared/middleware/roleGuard.js';
import {
  courier,
  dashboard,
  drivers,
  liabilities,
  payments,
  review,
  rides,
  suspendDriver,
  suspendUser,
  users,
  verifyDriver,
  withdrawals
} from './controllers/adminController.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));
router.get('/dashboard', dashboard);
router.get('/users', users);
router.patch('/users/:id/suspension', suspendUser);
router.get('/drivers', drivers);
router.patch('/drivers/:id/verification', verifyDriver);
router.patch('/drivers/:id/suspension', suspendDriver);
router.get('/rides', rides);
router.get('/courier', courier);
router.get('/payments', payments);
router.get('/liabilities', liabilities);
router.get('/withdrawals', withdrawals);
router.patch('/withdrawals/:id', review);

export default router;
