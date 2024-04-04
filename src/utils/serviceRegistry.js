const { logRequest } = require("../logger");
const { authMiddleware } = require("../middlewares/authMiddleware");
const axios = require('axios');


let currentServiceIdentifier = 10; // Start from 10 to allow 10 manual creation


// Store the middlewares applied for each services
const serviceConfigs = {};

module.exports = {
    addNewService(app, service) {
        currentServiceIdentifier++;

        module.exports.applyServerConfig(app, service, currentServiceIdentifier);

        return currentServiceIdentifier;
    },

    removeServiceByIdentifier(app, identifier) {
        let isDataDeleted = false;

        let routes = serviceConfigs[identifier.toString()].routes;
        let defaultMiddleware = serviceConfigs[identifier.toString()].defaultMiddleware;

        if (routes.length || defaultMiddleware) isDataDeleted = true;

        app._router.stack.forEach((layer, index, stack) => {
            if (layer.handle === defaultMiddleware) {
                stack.splice(index, 1);
            }
        });

        routes.forEach(route => {
            app._router.stack.forEach((layer, index, stack) => {
                if (layer.route && layer.route.path === route) {
                    stack.splice(index, 1);
                }
            });
        });

        serviceConfigs[identifier.toString()] = { routes: [], defaultMiddleware: null };

        return isDataDeleted;
    },

    applyServerConfig: (app, service, identifier) => {
        const key = identifier.toString();
        serviceConfigs[key] = { routes: [], defaultMiddleware: null };

        service.routeProtections && service.routeProtections.forEach(rule => {
            console.log(`[RULE URL] ${service.entrypointUrl}${rule.route}`);

            const protectedMiddleware = async(req, res) => {
                try {
                    let isCorrectRole = !rule.roles || !rule.roles.length || rule.roles.find((role) => role === req.roleLabel);
                    let isUserIdentified = req.userID != undefined || req.userID != "undefined";

                    if (!isCorrectRole) return res.status(403).json({ "error": "wrong role" });
                    if (!isUserIdentified) return res.status(403).json({ "error": "user undefined" });

                    return module.exports.redirectService(req, res, service);
                } catch (error) {
                    console.log(error);
                    return res.status(500).json({ "error": "internal error" });
                }
            }

            let methods = rule.methods;
            let allMethods = ["get", "post", "patch", "put", "delete"];

            if (!rule.methods || !rule.methods.length) methods = allMethods;

            let endpointUrl = `${service.entrypointUrl}${rule.route}`;

            methods.forEach(method => {
                console.log(`app.${method.toLowerCase()}('${service.entrypointUrl}${rule.route}', authMiddleware, protectedMiddleware)`);
                app[method.toLowerCase()](endpointUrl, authMiddleware, protectedMiddleware);
            });

            serviceConfigs[key].routes.push(endpointUrl);
        });

        const defaultMiddleware = async(req, res) => {
            try {
                return module.exports.redirectService(req, res, service);
            } catch (error) {
                console.log(error);
                return res.status(500).json({ "error": "internal error" });
            }
        }

        app.use(service.entrypointUrl, defaultMiddleware);

        serviceConfigs[key].defaultMiddleware = defaultMiddleware;
    },

    redirectService: async(req, res, service) => {
        const fqdn = "http://" + `${service.server.host}:${service.server.port}${req.originalUrl}`.replace(/\/\//g, '/').replace(service.entrypointUrl, service.redirectUrl);
        try {
            const response = await axios({
                method: req.method,
                baseURL: "http://" + `${service.server.host}:${service.server.port}`.replace(/\/\//g, '/'),
                url: `${req.originalUrl}`.replace(/\/\//g, '/').replace(service.entrypointUrl, service.redirectUrl),
                data: {...req.body },
                params: { userId: req.userId, roleLabel: req.roleLabel }
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