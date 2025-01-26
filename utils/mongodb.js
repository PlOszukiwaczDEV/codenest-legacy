import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI in your Vercel environment variables');
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            family: 4,
            retryWrites: true,
            retryReads: true,
            maxPoolSize: 10,
            minPoolSize: 5,
            maxIdleTimeMS: 10000,
            connectTimeoutMS: 30000,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts);
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    token: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    notes: [{ type: mongoose.Schema.Types.Mixed }]
}, { 
    timestamps: true,
    bufferCommands: false
});

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ token: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema); 