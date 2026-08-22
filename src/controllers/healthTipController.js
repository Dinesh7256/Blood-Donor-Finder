const HealthTip = require("../models/HealthTip");

const getHealthTips = async (req, res, next) => {
  try {
    const healthTips = await HealthTip.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: healthTips });
  } catch (error) {
    return next(error);
  }
};

const createHealthTip = async (req, res, next) => {
  try {
    const { title, content, category } = req.body;
    const healthTip = await HealthTip.create({ title, content, category });
    return res.status(201).json({ success: true, data: healthTip });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getHealthTips, createHealthTip };