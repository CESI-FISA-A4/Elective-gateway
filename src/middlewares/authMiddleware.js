const axios = require('axios');
const { logRequest } = require('../logger');

module.exports = {
    authMiddleware: async(req, res, next) => {
        const fqdn = `http://${process.env.AUTH_HOST}:${process.env.AUTH_PORT}/api/auth/verify-token/`;

        try {
            const response = await axios({
                method: "POST",
                baseURL: `http://${process.env.AUTH_HOST}:${process.env.AUTH_PORT}/`,
                url: `api/auth/verify-token/`,
                headers: req.headers,
            });

            logRequest(
                'info',
                response.status,
                `AUTH`,
                `POST : ${fqdn}`,
                `(FROM ${req.originalUrl})`
            );

            req.userId = response.data["userId"];
            req.roleLabel = response.data["roleLabel"];
            next();
        } catch (error) {
            if (error.response) {
                logRequest(
                    'error',
                    error.response.status,
                    `AUTH`,
                    `POST : ${fqdn}`,
                    `error (FROM ${req.originalUrl})`
                );
                return res.status(error.response.status).json({ "error": error.response.data });
            }
            logRequest(
                'error',
                500,
                `AUTH`,
                `POST : ${fqdn}`,
                `internal error (FROM ${req.originalUrl})`,
            );
            return res.status(500).json({ "error": "internal error" });
        }
    }
}