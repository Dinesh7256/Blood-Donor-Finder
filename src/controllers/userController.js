// Placeholder controller for user profile and account routes.
// These methods will be implemented in a later phase.

const userController = {
  getProfile: async (req, res) => {
    res.status(200).json({ message: "Get profile endpoint pending implementation" });
  },

  updateProfile: async (req, res) => {
    res.status(200).json({ message: "Update profile endpoint pending implementation" });
  },

  updateLocation: async (req, res) => {
    res.status(200).json({ message: "Update location endpoint pending implementation" });
  },
};

module.exports = userController;
