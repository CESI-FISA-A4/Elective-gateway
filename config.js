const { logRequest } = require("./logger");
const { authMiddleware } = require("./middlewares/authMiddleware");
const axios = require('axios');

const serviceConfigs = [{
        serviceLabel: "Service A",
        server: { host: process.env.SRV_A_HOST, port: process.env.SRV_A_PORT },
        entrypointUrl: "/api/sa",
        redirectUrl: "/api/a",
        routeProtections: [
            { route: "/tests/1" },
            // { methods: [], route: "/tests", roles: [] },
            // { methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTION"], route: "/tests", roles: ["ADMIN", "A", "B"] },
        ],
    },
    {
        serviceLabel: "Service Auth",
        server: { host: process.env.AUTH_HOST, port: process.env.AUTH_PORT },
        entrypointUrl: "/api/auth",
        redirectUrl: "/api/auth",
        routeProtections: null,
    }
];

module.exports = {
    applyServerConfig: (app) => {
        serviceConfigs.forEach(service => {

            service.routeProtections && service.routeProtections.forEach(rule => {
                console.log(`[RULE URL] ${service.entrypointUrl}${rule.route}`);

                app.use(`${service.entrypointUrl}${rule.route}`, authMiddleware, async(req, res) => {
                    try {
                        //Reset de l'url pour faciliter les redirections
                        req.url = rule.route + req.url;

                        // console.log(`[MID][${req.method}] ${service.redirectUrl}${req.url}`);

                        let isCorrectMethod = !rule.methods || !rule.methods.length || rule.methods.find((method) => method === req.method);
                        let isCorrectRole = !rule.roles || !rule.roles.length || rule.roles.find((role) => role === req.role);
                        let isUserIdentified = req.userID != undefined || req.userID != "undefined";

                        if (!isCorrectMethod) return res.status(403).json({ "error": "wrong method" });
                        if (!isCorrectRole) return res.status(403).json({ "error": "wrong role" });
                        if (!isUserIdentified) return res.status(403).json({ "error": "user undefined" });

                        return module.exports.redirectService(req, res, service);
                    } catch (error) {
                        return res.status(500).json({ "error": "internal error" });
                    }
                });
            });

            app.use(service.entrypointUrl, async(req, res) => {
                try {
                    // console.log(`[MID][${req.method}] ${service.redirectUrl}${req.url}`);
                    return module.exports.redirectService(req, res, service);
                } catch (error) {
                    return res.status(500).json({ "error": "internal error" });
                }
            });
        });
    },

    redirectService: async(req, res, service) => {
        const fqdn = `http://${service.server.host}:${service.server.port}${service.redirectUrl}${req.url}`;

        try {
            const response = await axios({
                method: req.method,
                baseURL: `http://${service.server.host}:${service.server.port}`,
                url: `${service.redirectUrl}${req.url}`,
                data: {...req.body, userID: req.userID, role: req.role }
            });

            let isCorrect = ["undefined", false, "null"].find((e) => e === req.auth);
            !isCorrect && (req.auth = -1);

            logRequest(
                'info',
                response.status,
                `REDIRECT ${service.serviceLabel}`,
                `${req.method} : ${fqdn}`,
                `(FROM ${req.originalUrl})`
            );

            return res.status(response.status).send(response.data);
        } catch (error) {
            if (error.response) {
                logRequest(
                    'error',
                    error.response.status,
                    `REDIRECT ${service.serviceLabel}`,
                    `${req.method} : ${fqdn}`,
                    `error (FROM ${req.originalUrl})`
                );
                return res.status(error.response.status).json({ "error": error.response.data });
            }
            logRequest(
                'error',
                500,
                `REDIRECT ${service.serviceLabel}`,
                `${req.method} : ${fqdn}`,
                `internal error (FROM ${req.originalUrl})`
            );
            return res.status(500).json({ "error": "internal error" });
        }
    }
}


// TODO AJOUT D'UN MODE RESTRICT !!