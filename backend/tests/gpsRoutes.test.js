const request = require('supertest');
const express = require('express');

const gpsRoutes = require('../routes/gpsRoutes');
const RobotGpsLogModel = require('../models/robotGpsLogModel');

jest.mock('../models/robotGpsLogModel');

describe('GPS API', () => {
    const app = express();
    app.use(express.json());
    app.use('/api/gps', gpsRoutes);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('GET /api/gps/latest returns latest row', async () => {
        RobotGpsLogModel.getLatest.mockResolvedValue({
            id: 1,
            lat: 10.123,
            lng: 106.456,
        });

        const res = await request(app).get('/api/gps/latest');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(1);
    });

    test('GET /api/gps/history returns rows with count', async () => {
        RobotGpsLogModel.getHistory.mockResolvedValue([
            { id: 2, fix: true, lat: 10.2, lng: 106.8 },
            { id: 1, fix: true, lat: 10.1, lng: 106.7 },
        ]);

        const res = await request(app).get('/api/gps/history?limit=2');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBe(2);
        expect(RobotGpsLogModel.getHistory).toHaveBeenCalledWith(expect.objectContaining({ limit: 2 }));
    });
});
