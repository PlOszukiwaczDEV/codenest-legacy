import { setCorsHeaders } from '../utils/cors';
const { connectToDatabase } = require('../utils/mongodb');
const { generateToken } = require('../middleware/auth');

export default async function handler(req, res) {
    if (setCorsHeaders(req, res)) return;

    try {
        const { code } = req.query;
        
        if (!code) {
            console.error('No code provided');
            return res.redirect('/?error=no_code');
        }

        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.REDIRECT_URI,
            }).toString()
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', tokenData);
            return res.redirect('/?error=token_exchange');
        }

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const userData = await userResponse.json();

        if (!userResponse.ok) {
            console.error('User data fetch failed:', userData);
            return res.redirect('/?error=user_fetch');
        }

        try {
            const db = await connectToDatabase();
            const userToken = generateToken();

            await db.collection('users').updateOne(
                { discordUid: userData.id },
                {
                    $set: {
                        username: userData.username,
                        email: userData.email,
                        avatar: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`,
                        token: userToken,
                        lastLogin: new Date(),
                    },
                    $setOnInsert: {
                        createdAt: new Date(),
                        notes: [],
                    },
                },
                { upsert: true }
            );

            const cookieOptions = {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            };

            res.setHeader('Set-Cookie', [
                `discord_token=${tokenData.access_token}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`,
                `user_token=${userToken}; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`
            ]);

            return res.redirect('/dashboard');
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.redirect('/?error=database_error');
        }
    } catch (error) {
        console.error('Auth error:', error);
        return res.redirect('/?error=server_error');
    }
} 