const axios = require('axios');
const { logRequest } = require('../logger');

module.exports = {
    authMiddleware: async(req, res, next) => {
        const fqdn = `http://${process.env.AUTH_HOST}:${process.env.AUTH_PORT}/`;

        try {
            const response = await axios({
                method: "POST",
                baseURL: `http://${process.env.AUTH_HOST}:${process.env.AUTH_PORT}/`,
                url: `api/auth/verify-token/`,
                headers: { 'Authorization': 'JWT' },
                params: req.query,
                data: req.body
            });

            logRequest(
                'info',
                response.status,
                `AUTH`,
                `${req.method} : ${fqdn}`,
                `(FROM ${req.originalUrl})`
            );

            req.userID = response.data["user-id"];
            req.role = response.data["role"];
            next();
        } catch (error) {
            if (error.response) {
                logRequest(
                    'error',
                    error.response.status,
                    `AUTH`,
                    `${req.method} : ${fqdn}`,
                    `error (FROM ${req.originalUrl})`
                );
                return res.status(error.response.status).json({ "error": error.response.data });
            }
            logRequest(
                'error',
                500,
                `AUTH`,
                `${req.method} : ${fqdn}`,
                `internal error (FROM ${req.originalUrl})`,
            );
            return res.status(500).json({ "error": "internal error" });
        }
    }
}