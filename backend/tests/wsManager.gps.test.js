const wsManager = require('../sockets/wsManager');

describe('wsManager GPS normalize', () => {
    const normalize = wsManager._test.normalizeGpsData;

    test('accept valid fix data', () => {
        const gps = normalize({
            fix: true,
            lat: 10.123,
            lng: 106.456,
            speed_kmh: 12.5,
            satellites: 8,
            hdop: 1.1,
        });

        expect(gps).toBeTruthy();
        expect(gps.fix).toBe(true);
        expect(gps.lat).toBe(10.123);
        expect(gps.lng).toBe(106.456);
    });

    test('keep fix false without lat/lng', () => {
        const gps = normalize({
            fix: false,
            speed_kmh: 0,
            satellites: 0,
        });

        expect(gps).toBeTruthy();
        expect(gps.fix).toBe(false);
        expect(gps.lat).toBeNull();
        expect(gps.lng).toBeNull();
    });

    test('reject out-of-range coordinates', () => {
        const gps = normalize({
            fix: true,
            lat: 123.45,
            lng: 106.78,
        });

        expect(gps).toBeNull();
    });
});
