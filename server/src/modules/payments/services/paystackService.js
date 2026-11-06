import AppError from '../../../shared/utils/AppError.js';

function getPaystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    throw new AppError('PAYSTACK_SECRET_KEY is not configured on the server.', 503);
  }

  return secret;
}

async function paystackRequest(path, options = {}) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getPaystackSecret()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let payload;
  try {
    payload = await response.json();
  } catch (_error) {
    throw new AppError('Paystack returned an invalid response.', 502);
  }

  if (!response.ok || !payload.status) {
    throw new AppError(payload.message || 'Paystack request failed.', 502);
  }

  return payload.data;
}

export function initializePaystackTransaction({ email, amountKobo, reference, metadata, callbackUrl }) {
  return paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: amountKobo,
      currency: 'NGN',
      reference,
      metadata,
      ...(callbackUrl ? { callback_url: callbackUrl } : {})
    })
  });
}

export function verifyPaystackTransaction(reference) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}
