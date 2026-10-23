import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set. Refusing to start with an insecure default secret.');
}

export const JWT_SECRET = process.env.JWT_SECRET;
