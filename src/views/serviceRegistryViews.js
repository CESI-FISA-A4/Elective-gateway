const { logRequest } = require("../logger");
const { addNewService, removeServiceByIdentifier } = require("../utils/serviceRegistry");

module.exports = {
    register: (app, req, res) => {
        const fqdn = `http://${process.env.HOST}:${process.env.PORT}/registry/services`;
        try {
            const { serviceLabel, host, port, entrypointUrl, redirectUrl, routeProtections } = req.body;

            if (!serviceLabel || !host || !port || !entrypointUrl || !redirectUrl) return res.status(401).json({ "error": "serviceLabel, host, port, entrypointUrl, redirectUrl required" });

            const server = { host, port };

            const data = { serviceLabel, server, entrypointUrl, redirectUrl, routeProtections };

            const serviceId = addNewService(app, data);

            logRequest(
                'info',
                201,
                `REGISTRY`,
                `${req.method} : ${fqdn}`,
                `service implemented (FROM ${req.originalUrl})`
            );
            return res.status(201).json({ "success": "service implemented", "serviceId": serviceId });
        } catch (error) {
            console.log(error);
            logRequest(
                'error',
                500,
                `REGISTRY`,
                `${req.method} : ${fqdn}`,
                `internal error (FROM ${req.originalUrl})`
            );
            return res.status(500).json({ "error": "internal error" });
        }
    },
    // {
    //     "serviceLabel": "Service Auth",
    //     "host": "localhost",
    //     "port": 3000,
    //     "entrypointUrl": "/api/auth",
    //     "redirectUrl": "/api/auth"
    // }

    delete: (app, req, res) => {
        const fqdn = `http://${process.env.HOST}:${process.env.PORT}/registry/services/${req.params.id}`;
        try {
            const id = req.params.id;

            let response = removeServiceByIdentifier(app, id);

            if (!response) {
                logRequest(
                    'info',
                    200,
                    `REGISTRY`,
                    `${req.method} : ${fqdn}`,
                    `service empty (FROM ${req.originalUrl})`
                );
                return res.status(200).json({ "message": `service ${id} empty` });
            }

            logRequest(
                'info',
                200,
                `REGISTRY`,
                `${req.method} : ${fqdn}`,
                `service implemented (FROM ${req.originalUrl})`
            );
            return res.status(200).json({ "message": `service ${id} successfully deleted` });
        } catch (error) {
            console.log(error);
            logRequest(
                'error',
                500,
                `REGISTRY`,
                `${req.method} : ${fqdn}`,
                `internal error (FROM ${req.originalUrl})`
            );
            return res.status(500).json({ "error": "internal error" });
        }
    }
}

// identifier: 2,
// serviceLabel: "Service Auth",
// server: { host: process.env.AUTH_HOST, port: process.env.AUTH_PORT },
// entrypointUrl: "/api/auth",
// redirectUrl: "/api/auth",
// routeProtections: null,


// [SECURE] add API KEY