const { logRequest } = require("../logger");
const { authMiddleware } = require("../middlewares/authMiddleware");
const axios = require('axios');

let currentServiceIdentifier = 10; // Start from 10 to allow 10 manual creation

// const serviceConfigs = [{
//         identifier: 1,
//         serviceLabel: "Service A",
//         server: { host: process.env.SRV_A_HOST, port: process.env.SRV_A_PORT },
//         entrypointUrl: "/api/sa",
//         redirectUrl: "/api/a",
//         routeProtections: [
//             { route: "/tests/1" },
//             // { methods: [], route: "/tests", roles: [] },
//             // { methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTION"], route: "/tests", roles: ["ADMIN", "A", "B"] },
//         ],
//     },
//     // {
//     //     identifier: 2,
//     //     serviceLabel: "Service Auth",
//     //     server: { host: process.env.AUTH_HOST, port: process.env.AUTH_PORT },
//     //     entrypointUrl: "/api/auth",
//     //     redirectUrl: "/api/auth",
//     //     routeProtections: null,
//     // }
// ];

// Store the middlewares applied for each services
const serviceConfigs = {
    // "1": {
    //     serviceLabel: "Service A",
    //     server: { host: process.env.SRV_A_HOST, port: process.env.SRV_A_PORT },
    //     entrypointUrl: "/api/sa",
    //     redirectUrl: "/api/a",
    //     routeProtections: [
    //         // { methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTION"], route: "/tests", roles: ["ADMIN", "A", "B"] },
    //     ],
    // }
};

module.exports = {
    // applyAllServerConfig: (app) => {
    //     serviceConfigs.forEach(service => {
    //         module.exports.applyServerConfig(app, service);
    //     });
    // },

    addNewService(app, service) {
        currentServiceIdentifier++;

        module.exports.applyServerConfig(app, service, currentServiceIdentifier);

        return currentServiceIdentifier;
    },

    removeServiceByIdentifier(app, identifier) {
        let middlewares = serviceConfigs[identifier.toString()];

        if (!middlewares || !middlewares.length) return false;

        middlewares.forEach(middleware => {
            app._router.stack.forEach((layer, index, stack) => {
                if (layer.handle === middleware) {
                    stack.splice(index, 1);
                }
            });
        });

        serviceConfigs[identifier.toString()] = [];

        return true;
    },

    applyServerConfig: (app, service, identifier) => {
        const key = identifier.toString();
        serviceConfigs[key] = [];

        service.routeProtections && service.routeProtections.forEach(rule => {
            console.log(`[RULE URL] ${service.entrypointUrl}${rule.route}`);

            const protectedMiddleware = async(req, res) => {
                try {
                    //Reset de l'url pour faciliter les redirections
                    req.url = rule.route + req.url;

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
            }

            app.use(`${service.entrypointUrl}${rule.route}`, authMiddleware, protectedMiddleware);

            serviceConfigs[key].push(protectedMiddleware);
        });

        const simpleMiddleware = async(req, res) => {
            try {
                return module.exports.redirectService(req, res, service);
            } catch (error) {
                return res.status(500).json({ "error": "internal error" });
            }
        }

        app.use(service.entrypointUrl, simpleMiddleware);

        serviceConfigs[key].push(simpleMiddleware);
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