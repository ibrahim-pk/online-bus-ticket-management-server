const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    purpose: { type: String, required: true },
    name: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("feedbacks", feedbackSchema);
