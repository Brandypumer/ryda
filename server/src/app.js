import cors from 'cors';
import express from 'express';
import { notFoundHandler, errorHandler } from './shared/middleware/errorMiddleware.js';
import paymentRoutes from './modules/payments/paymentRoutes.js';
import liabilityRoutes from './modules/payments/liabilityRoutes.js';
import adminRoutes from './modules/admin/adminRoutes.js';
import { identityRouter } from './modules/identity/index.js';
import courierRouter from './modules/courier/courier.router.js';
import driverOpsRouter from './modules/driverOps/driverOps.router.js';
import rideOperationsRouter from './modules/rides/routes/rideOperationsRoutes.js';
import rideRequestRouter from './modules/rides/routes/rideRequestRoutes.js';
import { getClientOrigin } from './shared/config/clientOrigin.js';

const app = express();

app.use(cors({ origin: getClientOrigin() }));
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use('/api', identityRouter);
app.use('/api/payments', paymentRoutes);
app.use('/api/rides', rideRequestRouter);
app.use('/api/rides', rideOperationsRouter);
app.use('/api/courier', courierRouter);
app.use('/api/driver', driverOpsRouter);
app.use('/api/driver', liabilityRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
