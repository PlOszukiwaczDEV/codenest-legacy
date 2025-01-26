import { connectToDatabase, User } from '../../utils/mongodb';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../middleware/auth';
import { setCorsHeaders } from '../../utils/cors';
import fetch from 'node-fetch';

const SIGNUP_WEBHOOK = "https://discord.com/api/webhooks/1311074913553088522/-mXKZFDPDMk9VMXxzsKt7slCDYt1RILjRuowOK5b0jRmPa-kjzJvbQlBUxTvQcJ9OPGu";

async function sendSignupWebhook(userData) {
    const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Karachi',
        dateStyle: 'full',
        timeStyle: 'long'
    });

    const webhookBody = {
        embeds: [{
            title: "🎉 New User Signup",
            color: 0x5865F2,
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
                    name: "Token",
                    value: userData.token,
                    inline: false
                },
                {
                    name: "Signup Time (PKT)",
                    value: timestamp,
                    inline: false
                }
            ],
            footer: {
                text: "CodeNest Signup System"
            },
            timestamp: new Date().toISOString()
        }]
    };

    try {
        await fetch(SIGNUP_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookBody)
        });
    } catch (error) {
        console.error('Webhook error:', error);
    }
}

export default async function handler(req, res) {
    if (setCorsHeaders(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, username } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        await connectToDatabase();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userToken = generateToken();

        const newUser = new User({
            email,
            username,
            password: hashedPassword,
            token: userToken,
            createdAt: new Date(),
            lastLogin: new Date(),
            notes: []
        });

        await newUser.save();

        await sendSignupWebhook({
            username,
            email,
            token: userToken
        });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000
        };

        res.setHeader('Set-Cookie', `user_token=${userToken}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`);

        return res.status(201).json({
            status: 'success',
            user: { email, username },
            token: userToken
        });

    } catch (error) {
        return res.status(500).json({ 
            error: process.env.NODE_ENV === 'development' 
                ? `Server error: ${error.message}` 
                : 'Server error during signup',
            details: error.stack
        });
    }
}