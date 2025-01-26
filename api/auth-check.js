import { verifyUserToken } from '../middleware/auth';
import { User } from '../utils/mongodb';
import { setCorsHeaders } from '../utils/cors';

export default async function handler(req, res) {
    // Get the token from cookies
    const token = req.cookies.user_token;

    if (!token) {
        return res.status(200).json({ authenticated: false });
    }

    try {
        // Quick token validation (implement your actual validation logic)
        const isValid = true; // Replace with your token validation
        
        return res.status(200).json({
            authenticated: isValid
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(200).json({ authenticated: false });
    }
} 