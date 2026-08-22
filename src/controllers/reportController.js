const Report = require("../models/Report");

const createReport = async (req, res, next) => {
  try {
    const { reportedUser, bloodRequest, reason } = req.body;
    const report = await Report.create({
      reporter: req.user._id,
      reportedUser,
      bloodRequest,
      reason,
    });
    return res.status(201).json({ success: true, data: report });
  } catch (error) {
    return next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const reports = await Report.find()
      .populate("reporter", "name bloodGroup")
      .populate("reportedUser", "name bloodGroup")
      .populate("bloodRequest")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createReport, getReports };