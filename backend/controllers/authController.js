const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

function sanitizeUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
    };
}

function validateRegisterInput({ username, email, password }) {
    if (!username || !email || !password) {
        return 'username, email, password are required';
    }

    if (typeof username !== 'string' || username.trim().length < 3) {
        return 'username must be at least 3 characters';
    }

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'invalid email format';
    }

    if (typeof password !== 'string' || password.length < 6) {
        return 'password must be at least 6 characters';
    }

    return null;
}

function validateLoginInput({ identifier, password }) {
    if (!identifier || !password) {
        return 'identifier and password are required';
    }

    return null;
}

function validateEmailInput(email) {
    if (!email || typeof email !== 'string') {
        return 'email is required';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'invalid email format';
    }

    return null;
}

function validatePasswordChangeInput({ oldPassword, newPassword, confirmPassword }) {
    if (!oldPassword || !newPassword || !confirmPassword) {
        return 'oldPassword, newPassword, confirmPassword are required';
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return 'newPassword must be at least 6 characters';
    }

    if (newPassword !== confirmPassword) {
        return 'confirmPassword does not match newPassword';
    }

    return null;
}

function signToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT secret is not configured');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

    return jwt.sign(
        {
            sub: user.id,
            username: user.username,
            role: user.role,
            email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn }
    );
}

class AuthController {
    static async register(req, res) {
        try {
            const username = (req.body.username || '').trim();
            const email = (req.body.email || '').trim().toLowerCase();
            const password = req.body.password;

            const validationError = validateRegisterInput({ username, email, password });
            if (validationError) {
                return res.status(400).json({ success: false, error: validationError });
            }

            const existingByUsername = await UserModel.getUserByUsername(username);
            if (existingByUsername) {
                return res.status(409).json({ success: false, error: 'username already exists' });
            }

            const existingByEmail = await UserModel.getUserByEmail(email);
            if (existingByEmail) {
                return res.status(409).json({ success: false, error: 'email already exists' });
            }

            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            const user = await UserModel.createUser(username, passwordHash, 'user', email);

            return res.status(201).json({
                success: true,
                message: 'register successful',
                data: sanitizeUser(user)
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    static async login(req, res) {
        try {
            const identifier = (req.body.identifier || req.body.email || req.body.username || '').trim();
            const password = req.body.password;

            const validationError = validateLoginInput({ identifier, password });
            if (validationError) {
                return res.status(400).json({ success: false, error: validationError });
            }

            const user = await UserModel.getUserByEmailOrUsername(identifier);
            if (!user) {
                return res.status(401).json({ success: false, error: 'invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ success: false, error: 'invalid credentials' });
            }

            const token = signToken(user);

            return res.json({
                success: true,
                message: 'login successful',
                data: {
                    token,
                    role: user.role,
                    user: sanitizeUser(user)
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    static async me(req, res) {
        try {
            const user = await UserModel.getUserById(req.user.sub);
            if (!user) {
                return res.status(404).json({ success: false, error: 'user not found' });
            }

            return res.json({
                success: true,
                data: sanitizeUser(user)
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    static async updateMe(req, res) {
        try {
            const email = (req.body.email || '').trim().toLowerCase();
            const validationError = validateEmailInput(email);
            if (validationError) {
                return res.status(400).json({ success: false, error: validationError });
            }

            const existingByEmail = await UserModel.getUserByEmail(email);
            if (existingByEmail && Number(existingByEmail.id) !== Number(req.user.sub)) {
                return res.status(409).json({ success: false, error: 'email already exists' });
            }

            const updated = await UserModel.updateUser(req.user.sub, { email });
            if (!updated) {
                return res.status(404).json({ success: false, error: 'user not found' });
            }

            return res.json({
                success: true,
                message: 'profile updated',
                data: sanitizeUser(updated)
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    static async changePassword(req, res) {
        try {
            const validationError = validatePasswordChangeInput(req.body || {});
            if (validationError) {
                return res.status(400).json({ success: false, error: validationError });
            }

            const { oldPassword, newPassword } = req.body;
            const user = await UserModel.getUserByIdWithPassword(req.user.sub);
            if (!user) {
                return res.status(404).json({ success: false, error: 'user not found' });
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
            if (!isMatch) {
                return res.status(400).json({ success: false, error: 'oldPassword is incorrect' });
            }

            const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
            await UserModel.updatePassword(user.id, newPasswordHash);

            return res.json({
                success: true,
                message: 'password changed successfully'
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    static async adminCheck(req, res) {
        return res.json({
            success: true,
            message: 'admin access granted'
        });
    }
}

module.exports = AuthController;
