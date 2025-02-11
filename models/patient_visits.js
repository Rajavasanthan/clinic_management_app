const mongoose = require("mongoose");

const PatientVisitSchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
  },
  patient_puid: {
    type: String
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
  },
  visit_date: {
    type: Date,
    default: Date.now,
  },
  visit_reason: {
    type: String,
  },
  visit_diagnosis: {
    type: String,
  },
  visit_prescription: {
    type: String,
  },
  visit_notes: {
    type: String,
  },
  nextVisit : {
    type: Date
  },
  status : {
    type: String,
    default: "pending"
  }
});

const PatientVisit = mongoose.model("PatientVisit", PatientVisitSchema);

module.exports = {PatientVisit};
