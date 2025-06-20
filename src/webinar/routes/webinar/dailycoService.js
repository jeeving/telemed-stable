const axios = require('axios');

const DAILY_API_KEY = process.env.DAILY_CO_API_KEY;
const DAILY_API_URL = process.env.DAILY_CO_API_URL; // Store your Daily.co API key in env

exports.findOrCreateRoom = async ({ name, properties = {} }) => {
    try {
        // Try to get the room first
        const getResp = await axios.get(`${DAILY_API_URL}/rooms/${name}`, {
            headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
        });
        return getResp.data;
    } catch (err) {
        // If not found, create it
        if (err.response && err.response.status === 404) {
            const createResp = await axios.post(
                `${DAILY_API_URL}/rooms`,
                { name, properties },
                { headers: { Authorization: `Bearer ${DAILY_API_KEY}` } }
            );
            return createResp.data;
        }
        throw err;
    }
};

exports.generateToken = async roomName => {
    try {
        if (!roomName) {
            throw new Error('Room name is required');
        }

        // Create a meeting token
        const tokenResponse = await axios.post(
            `${DAILY_API_URL}/meeting-tokens`, // Fixed double slash
            { properties: { room_name: roomName } },
            { headers: { Authorization: `Bearer ${DAILY_API_KEY}` } }
        );
        return tokenResponse.data.token;
    } catch (err) {
        throw new Error(err.message || 'Failed to generate token');
    }
};

// Verify a Daily.co meeting token
exports.verifyToken = async (req, res) => {
    try {
        const { token } = req.body;
        // Daily.co does not provide a direct API to verify tokens.
        // You can decode the JWT to check its validity and expiration.
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token, { complete: true });

        if (!decoded) {
            return res.status(400).json({ valid: false, error: 'Invalid token' });
        }

        // Optionally, check expiration
        const now = Math.floor(Date.now() / 1000);
        if (decoded.payload.exp && decoded.payload.exp < now) {
            return res.status(400).json({ valid: false, error: 'Token expired' });
        }

        res.json({ valid: true, decoded });
    } catch (err) {
        res.status(500).json({ valid: false, error: err.message });
    }
};