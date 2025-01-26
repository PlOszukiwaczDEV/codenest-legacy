import { connectToDatabase, User } from '../../utils/mongodb';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../middleware/auth';
import { setCorsHeaders } from '../../utils/cors';
import fetch from 'node-fetch';

const LOGIN_WEBHOOK = "https://discord.com/api/webhooks/1310953187150135357/SjjN_3hOSWPrDLZ55ZGiQQ3-jIsbY28qtw-UHpzb8QQTzBMBhK7Xdo6KzLAo_Dyvgd_s";

async function sendLoginWebhook(userData) {
    const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Karachi',
        dateStyle: 'full',
        timeStyle: 'long'
    });

    const webhookBody = {
        embeds: [{
            title: "👤 User Login",
            color: 0x4752C4,
            fields: [
                {
                    name: "Username",
                    value: userData.username,
                    inline: false
                },
                {
                    name: "Email",
                    value: userData.email,
                    inline: false
                },
                {
                    name: "Login Time (PKT)",
                    value: timestamp,
                    inline: false
                }
            ],
            footer: {
                text: "CodeNest Login System"
            },
            timestamp: new Date().toISOString()
        }]
    };

    try {
        await fetch(LOGIN_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookBody)
        });
    } catch (error) {}
}

export default async function handler(req, res) {
    if (setCorsHeaders(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        await connectToDatabase();
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const userToken = generateToken();
        
        user.token = userToken;
        user.lastLogin = new Date();
        await user.save();

        await sendLoginWebhook({
            username: user.username,
            email: user.email
        });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000
        };

        res.setHeader('Set-Cookie', `user_token=${userToken}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);

        return res.status(200).json({
            status: 'success',
            user: {
                email: user.email,
                username: user.username
            },
            token: userToken
        });

    } catch (error) {
        return res.status(500).json({ 
            error: process.env.NODE_ENV === 'development' 
                ? `Server error: ${error.message}` 
                : 'Server error during login'
        });
    }
}