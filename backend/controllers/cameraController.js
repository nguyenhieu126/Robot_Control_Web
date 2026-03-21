const http = require('http');
const https = require('https');

const DEFAULT_CAMERA_SOURCE_URL = 'http://127.0.0.1:8080';
const DEFAULT_TIMEOUT_MS = 5000;

function _safeParseCameraBaseUrl() {
    const raw = (process.env.CAMERA_SOURCE_URL || DEFAULT_CAMERA_SOURCE_URL).trim();

    try {
        const parsed = new URL(raw);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { ok: false, error: 'CAMERA_SOURCE_URL must use http or https protocol' };
        }

        if (!parsed.hostname) {
            return { ok: false, error: 'CAMERA_SOURCE_URL hostname is required' };
        }

        parsed.username = '';
        parsed.password = '';
        return { ok: true, url: parsed };
    } catch (error) {
        return { ok: false, error: `Invalid CAMERA_SOURCE_URL: ${error.message}` };
    }
}

function _joinPath(basePathname, extraPathname) {
    const base = (basePathname || '/').replace(/\/+$/, '');
    const extra = (extraPathname || '').replace(/^\/+/, '');
    if (!extra) {
        return base || '/';
    }
    if (!base || base === '/') {
        return `/${extra}`;
    }
    return `${base}/${extra}`;
}

function _createUpstreamUrl(pathname) {
    const parsed = _safeParseCameraBaseUrl();
    if (!parsed.ok) {
        return parsed;
    }

    const url = new URL(parsed.url.toString());
    url.pathname = _joinPath(parsed.url.pathname, pathname);
    url.search = '';
    return { ok: true, url };
}

function _pickHttpClient(url) {
    return url.protocol === 'https:' ? https : http;
}

function _requestJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const client = _pickHttpClient(url);
        const req = client.request(
            {
                method: 'GET',
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: `${url.pathname}${url.search}`,
                timeout: timeoutMs,
                headers: {
                    Accept: 'application/json',
                },
            },
            (upstreamRes) => {
                let body = '';

                upstreamRes.on('data', (chunk) => {
                    body += chunk.toString();
                });

                upstreamRes.on('end', () => {
                    if (upstreamRes.statusCode < 200 || upstreamRes.statusCode >= 300) {
                        return reject(new Error(`Upstream responded with status ${upstreamRes.statusCode}`));
                    }

                    try {
                        resolve(JSON.parse(body || '{}'));
                    } catch (error) {
                        reject(new Error('Upstream health response is not valid JSON'));
                    }
                });
            }
        );

        req.on('timeout', () => {
            req.destroy(new Error('Upstream request timeout'));
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function getHealth(req, res) {
    const target = _createUpstreamUrl('/health');
    if (!target.ok) {
        return res.status(500).json({
            success: false,
            sourceOnline: false,
            error: target.error,
            lastCheckedAt: new Date().toISOString(),
        });
    }

    try {
        const data = await _requestJson(target.url);
        return res.json({
            success: true,
            sourceOnline: true,
            data,
            lastCheckedAt: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(502).json({
            success: false,
            sourceOnline: false,
            error: `Camera source unavailable: ${error.message}`,
            lastCheckedAt: new Date().toISOString(),
        });
    }
}

function getStream(req, res) {
    const target = _createUpstreamUrl('/stream.mjpg');
    if (!target.ok) {
        return res.status(500).json({
            success: false,
            error: target.error,
        });
    }

    const client = _pickHttpClient(target.url);
    const upstreamReq = client.request(
        {
            method: 'GET',
            hostname: target.url.hostname,
            port: target.url.port || (target.url.protocol === 'https:' ? 443 : 80),
            path: `${target.url.pathname}${target.url.search}`,
            timeout: DEFAULT_TIMEOUT_MS,
            headers: {
                Accept: 'multipart/x-mixed-replace, image/jpeg, */*',
                Connection: 'keep-alive',
            },
        },
        (upstreamRes) => {
            const statusCode = upstreamRes.statusCode || 502;
            if (statusCode < 200 || statusCode >= 300) {
                let body = '';
                upstreamRes.on('data', (chunk) => {
                    body += chunk.toString();
                });

                upstreamRes.on('end', () => {
                    if (!res.headersSent) {
                        res.status(502).json({
                            success: false,
                            error: 'Camera stream source returned non-success status',
                            detail: body.slice(0, 300),
                        });
                    }
                });
                return;
            }

            res.status(200);
            res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'multipart/x-mixed-replace; boundary=frame');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('X-Accel-Buffering', 'no');

            upstreamRes.on('error', (error) => {
                if (!res.headersSent) {
                    res.status(502).json({
                        success: false,
                        error: `Camera stream interrupted: ${error.message}`,
                    });
                } else {
                    res.end();
                }
            });

            upstreamRes.pipe(res);
        }
    );

    upstreamReq.on('timeout', () => {
        upstreamReq.destroy(new Error('Camera stream request timeout'));
    });

    upstreamReq.on('error', (error) => {
        if (!res.headersSent) {
            res.status(502).json({
                success: false,
                error: `Unable to connect camera source: ${error.message}`,
            });
        } else {
            res.end();
        }
    });

    req.on('close', () => {
        upstreamReq.destroy();
    });

    upstreamReq.end();
}

module.exports = {
    getHealth,
    getStream,
};
