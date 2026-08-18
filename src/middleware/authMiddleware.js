// Placeholder authentication middleware.
// This will later verify the Firebase or JWT token from the request.

const authMiddleware = {
  verifyToken: async (req, res, next) => {
    // TODO: Replace with real token verification logic.
    req.user = { id: "demo-user-id" };
    next();
  },
};

module.exports = authMiddleware;
