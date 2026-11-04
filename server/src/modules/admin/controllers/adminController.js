import AppError from '../../../shared/utils/AppError.js';
import {
  getDashboardSummary,
  listDrivers,
  listRecords,
  listUsers,
  listWithdrawals,
  reviewWithdrawal,
  updateDriverSuspension,
  updateUserSuspension,
  updateDriverVerification
} from '../services/adminService.js';

export async function dashboard(_request, response, next) {
  try { return response.status(200).json(await getDashboardSummary()); } catch (error) { return next(error); }
}

export async function users(_request, response, next) {
  try { return response.status(200).json({ users: await listUsers() }); } catch (error) { return next(error); }
}

export async function drivers(_request, response, next) {
  try { return response.status(200).json({ drivers: await listDrivers() }); } catch (error) { return next(error); }
}

export async function verifyDriver(request, response, next) {
  try {
    const driver = await updateDriverVerification(request.params.id, request.body.verificationStatus);
    return response.status(200).json({ driver });
  } catch (error) { return next(error); }
}

export async function suspendDriver(request, response, next) {
  try {
    const driver = await updateDriverSuspension(request.params.id, request.body.isSuspended);
    return response.status(200).json({ driver });
  } catch (error) { return next(error); }
}

export async function suspendUser(request, response, next) {
  try {
    const user = await updateUserSuspension(request.params.id, request.body.suspended);
    return response.status(200).json({ user });
  } catch (error) { return next(error); }
}

export async function rides(_request, response, next) {
  try { return response.status(200).json({ rides: await listRecords('Ride') }); } catch (error) { return next(error); }
}

export async function courier(_request, response, next) {
  try { return response.status(200).json({ courier: await listRecords('CourierDelivery') }); } catch (error) { return next(error); }
}

export async function payments(_request, response, next) {
  try { return response.status(200).json({ payments: await listRecords('Payment') }); } catch (error) { return next(error); }
}

export async function liabilities(_request, response, next) {
  try { return response.status(200).json({ liabilities: await listRecords('PlatformFeeLiability') }); } catch (error) { return next(error); }
}

export async function withdrawals(_request, response, next) {
  try { return response.status(200).json({ withdrawals: await listWithdrawals() }); } catch (error) { return next(error); }
}

export async function review(request, response, next) {
  try {
    if (!request.body.status) throw new AppError('status is required.', 400);
    const withdrawal = await reviewWithdrawal(request.params.id, request.body.status, request.user.id, request.body.adminNote);
    return response.status(200).json({ withdrawal });
  } catch (error) { return next(error); }
}
