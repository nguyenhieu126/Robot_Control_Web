const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const authRoutes = require('../routes/authRoutes');
const UserModel = require('../models/userModel');
const bcrypt = require('bcrypt');

jest.mock('../models/userModel');
jest.mock('bcrypt');

describe('Auth API', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    beforeAll(() => {
        process.env.JWT_SECRET = 'test_jwt_secret';
        process.env.JWT_EXPIRES_IN = '1h';
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('register success', async () => {
        UserModel.getUserByUsername.mockResolvedValue(null);
        UserModel.getUserByEmail.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue('hashed_password');
        UserModel.createUser.mockResolvedValue({
            id: 1,
            username: 'newuser',
            email: 'newuser@example.com',
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'newuser', email: 'newuser@example.com', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.username).toBe('newuser');
    });

    test('register failed when missing field', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'missing@example.com' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('register failed when duplicate email', async () => {
        UserModel.getUserByUsername.mockResolvedValue(null);
        UserModel.getUserByEmail.mockResolvedValue({ id: 10, email: 'dup@example.com' });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'dup', email: 'dup@example.com', password: 'password123' });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    test('login success', async () => {
        UserModel.getUserByEmailOrUsername.mockResolvedValue({
            id: 2,
            username: 'admin',
            email: 'admin@robot.local',
            role: 'admin',
            password_hash: 'hashed'
        });
        bcrypt.compare.mockResolvedValue(true);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: 'admin@robot.local', password: 'Admin@123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.role).toBe('admin');
        expect(res.body.data.token).toBeTruthy();
    });

    test('login failed when wrong password', async () => {
        UserModel.getUserByEmailOrUsername.mockResolvedValue({
            id: 2,
            username: 'admin',
            email: 'admin@robot.local',
            role: 'admin',
            password_hash: 'hashed'
        });
        bcrypt.compare.mockResolvedValue(false);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: 'admin@robot.local', password: 'wrong-password' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test('admin route blocked with invalid token', async () => {
        const res = await request(app)
            .get('/api/auth/admin-check')
            .set('Authorization', 'Bearer invalid.token.value');

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test('admin route blocked for non-admin role', async () => {
        const userToken = jwt.sign(
            { sub: 3, username: 'user1', role: 'user', email: 'u1@example.com' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const res = await request(app)
            .get('/api/auth/admin-check')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });
});
