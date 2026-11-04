import AppError from '../../../shared/utils/AppError.js';
import DriverProfile from '../models/DriverProfile.js';

export async function ensureDriverVerificationCanBeSubmitted(userId) {
  const existingProfile = await DriverProfile.findOne({ userId });

  if (existingProfile && existingProfile.verificationStatus !== 'REJECTED') {
    throw new AppError('Driver verification has already been submitted.', 409);
  }

  return existingProfile;
}

export async function submitDriverVerification(userId, submission) {
  const existingProfile = await ensureDriverVerificationCanBeSubmitted(userId);

  if (existingProfile) {
    const profile = await DriverProfile.findOneAndUpdate(
      { _id: existingProfile._id, userId, verificationStatus: 'REJECTED' },
      { $set: { ...submission, verificationStatus: 'PENDING' } },
      { new: true, runValidators: true }
    );

    if (!profile) {
      throw new AppError('Driver verification status changed before resubmission. Refresh and try again.', 409);
    }

    return profile;
  }

  try {
    return await DriverProfile.create({
      userId,
      vehicleType: 'KEKE',
      verificationStatus: 'PENDING',
      ...submission
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError('Driver verification has already been submitted.', 409);
    }

    throw error;
  }
}

export async function getDriverVerification(userId) {
  const profile = await DriverProfile.findOne({ userId });

  if (!profile) {
    throw new AppError('Driver verification has not been submitted.', 404);
  }

  return profile;
}
