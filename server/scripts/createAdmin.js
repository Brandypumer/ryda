import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import connectDatabase from '../src/shared/config/database.js';
import User from '../src/modules/identity/models/User.js';

const PASSWORD_ROUNDS = 12;
const currentFilePath = fileURLToPath(import.meta.url);

dotenv.config({ path: path.resolve(path.dirname(currentFilePath), '../.env') });

function requiredEnvironmentValue(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function adminInputFromEnvironment(environment = process.env) {
  const email = environment.ADMIN_EMAIL?.trim().toLowerCase();
  const password = environment.ADMIN_PASSWORD;
  const fullName = environment.ADMIN_FULL_NAME?.trim() || 'Ryda Demo Admin';
  const phone = environment.ADMIN_PHONE?.trim() || 'N/A';

  if (!email) throw new Error('ADMIN_EMAIL is required.');
  if (!password) throw new Error('ADMIN_PASSWORD is required.');
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');

  return { email, password, fullName, phone };
}

export async function createAdmin({ UserModel = User, bcryptClient = bcrypt, environment = process.env } = {}) {
  const { email, password, fullName, phone } = adminInputFromEnvironment(environment);
  const existingUser = await UserModel.findOne({ email }).select('+passwordHash');

  if (existingUser) {
    if (existingUser.role === 'ADMIN') {
      return { created: false, reason: 'already-admin' };
    }

    throw new Error('This email already belongs to a non-admin account. No changes were made.');
  }

  const passwordHash = await bcryptClient.hash(password, PASSWORD_ROUNDS);
  await UserModel.create({ fullName, email, phone, passwordHash, role: 'ADMIN' });

  return { created: true, reason: 'created' };
}

async function main() {
  requiredEnvironmentValue('MONGODB_URI');
  await connectDatabase();

  try {
    const result = await createAdmin();

    if (result.created) {
      console.log('Demo admin account created.');
    } else {
      console.log('Demo admin account already exists; no changes were made.');
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  main().catch((error) => {
    console.error(`Admin bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  });
}
