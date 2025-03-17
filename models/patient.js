const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema({
  patient_name: {
    type: String,
    required: true,
  },
  patient_puid: {
    type: String,
    required: true,
    unique: true,
  },
  patient_phone_number: {
    type: String,
    required: true,
    unique: true,
  },
  patient_email: {
    type: String,
  },
  patient_gender: {
    type: String,
  },
  patient_age: {
    type: String,
  },
  patient_address: {
    type: String,
  },
  patient_emmergency_contact: {
    type: String,
  },
  patient_insurance_number: {
    type: String,
  },
  patient_blood_group: {
    type: String,
  },
  patient_allergies: {
    type: [
      {
        type: String,
      },
    ],
  },
  visits: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientVisit",
    }
  ],
});

PatientSchema.index({ patient_name: "text" });

const Patient = mongoose.model("Patient", PatientSchema);

module.exports = { Patient };
