import crypto from 'crypto';
import { connectToDatabase, User } from '../utils/mongodb';

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function verifyUserToken(req, res, next) {
  const token = req.cookies.user_token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    await connectToDatabase();
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: user._id,
      email: user.email,
      username: user.username
    };

    return next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
} 