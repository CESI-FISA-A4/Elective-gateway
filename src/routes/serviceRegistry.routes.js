const serviceRegistryViews = require("../views/serviceRegistryViews");

module.exports = function(app) {
    app.post("/registry/services", (req, res) => serviceRegistryViews.register(app, req, res));
    // app.put("/registry/services/:id", (req, res) => serviceRegistryViews.update(app, req, res));
    app.delete("/registry/services/:identifier", (req, res) => serviceRegistryViews.delete(app, req, res));
};