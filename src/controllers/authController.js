// Placeholder controller for authentication routes.
// This file will hold actual register/login logic in a later phase.

const authController = {
  register: async (req, res) => {
    res.status(200).json({ message: "Register endpoint pending implementation" });
  },

  login: async (req, res) => {
    res.status(200).json({ message: "Login endpoint pending implementation" });
  },
};

module.exports = authController;
