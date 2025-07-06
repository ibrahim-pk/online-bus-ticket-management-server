const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bus: {
      type: mongoose.Schema.ObjectId,
      ref: "buses",
      require: true,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "users",
      require: true,
    },
    seats: {
      type: Array,
      require: true,
    },
    transactionId: {
      type: String,
      
    },
    payment: {
      type: Boolean,
      default:false
      
    },
    amount: {
      type: String,
      requre:true
      
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("bookings", bookingSchema);
