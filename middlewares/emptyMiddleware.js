module.exports = {
    emptyMiddleware: async(req, res, next) => {
        next();
    }
}