import {
  ensureDriverVerificationCanBeSubmitted,
  getDriverVerification,
  submitDriverVerification
} from '../services/driverVerificationService.js';
import { uploadDriverVerificationFile } from '../services/driverVerificationUploadService.js';
import { validateDriverVerificationInput } from '../validation/driverVerificationValidation.js';
import AppError from '../../../shared/utils/AppError.js';

function getUploadedFile(files, fieldName) {
  const file = files?.[fieldName]?.[0];

  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  return file;
}

export async function uploadVerificationDocuments(request, response, next) {
  try {
    await ensureDriverVerificationCanBeSubmitted(request.user.id);
    const vehicleImage = getUploadedFile(request.files, 'vehicleImage');
    const identityDocument = getUploadedFile(request.files, 'identityDocument');
    const [vehicleImageUrl, identityDocumentUrl] = await Promise.all([
      uploadDriverVerificationFile({ userId: request.user.id, fieldName: 'vehicleImage', file: vehicleImage }),
      uploadDriverVerificationFile({ userId: request.user.id, fieldName: 'identityDocument', file: identityDocument })
    ]);

    response.status(200).json({ vehicleImage: vehicleImageUrl, identityDocument: identityDocumentUrl });
  } catch (error) {
    next(error);
  }
}

export async function submitVerification(request, response, next) {
  try {
    const submission = validateDriverVerificationInput(request.body);
    const profile = await submitDriverVerification(request.user.id, submission);
    response.status(201).json({ profile });
  } catch (error) {
    next(error);
  }
}

export async function getMyVerification(request, response, next) {
  try {
    const profile = await getDriverVerification(request.user.id);
    response.status(200).json({ profile });
  } catch (error) {
    next(error);
  }
}
