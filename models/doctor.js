const mongoose = require("mongoose");

const DoctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  medicalId: {
    type: String,
    required: true,
  },
});

const Doctor = mongoose.model("Doctor", DoctorSchema);

module.exports = {Doctor};
