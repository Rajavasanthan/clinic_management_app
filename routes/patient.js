var express = require("express");
const { Patient } = require("../models/patient");
const { RecordCounter } = require("../models/record_counter");
const { PatientVisit } = require("../models/patient_visits");
var router = express.Router();

const buildQuery = (params) => {
  const query = {};

  // Add name search if provided
  if (params.name) {
    query.$text = { $search: params.name };
    // Alternatively, if you haven't set up text index, you can use regex
    // query.name = { $regex: params.name, $options: 'i' };
  }

  // Add phone number if provided
  if (params.phone) {
    query.patient_phone_number = params.phone;
  }

  // Add PUID if provided
  if (params.puid) {
    query.patient_puid = params.puid;
  }

  return query;
};

router.post("/create", async function (req, res) {
  try {
    const recordCounter = await RecordCounter.findOne({
      type: "PATIENT",
    });
    if (!recordCounter) {
      const counter = new RecordCounter({
        counter: 1,
        type: "PATIENT",
      });
      await counter.save();
      req.body.patient_puid = process.env.CLINIC_NAME + 1;
    }
    req.body.patient_puid = process.env.CLINIC_NAME + recordCounter.counter;
    const patient = new Patient(req.body);
    await patient.save();
    recordCounter.counter = recordCounter.counter + 1;
    await recordCounter.save();
    return res.json({
      message: "Patient Created",
      puid: req.body.patient_puid,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/list", async function (req, res) {
  try {
    const patients = await Patient.find();
    return res.json(patients);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/total-patients", async function (req, res) {
  try {
    const totalPatients = await Patient.countDocuments();
    return res.json({ totalPatients });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/search_patient", async function (req, res) {
  try {
    const patient_name = req.query.patient_name;
    const patient_phone_number = req.query.patient_phone_number;
    const patient_puid = req.query.patient_puid;

    const searchQuery = buildQuery({
      name: patient_name,
      phone: patient_phone_number,
      puid: patient_puid,
    });

    console.log(searchQuery);

    const patient = await Patient.find(searchQuery);
    res.json(patient);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:puid", async function (req, res) {
  try {
    const patient = await Patient.findOne({ patient_puid: req.params.puid });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    return res.json(patient);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/:puid/history", async function (req, res) {
  try {
    const patient = await PatientVisit.find({
      patient_puid: req.params.puid,
    });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    return res.json(patient);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/:puid/history", async function (req, res) {
  try {
    const patient = await Patient.findOne({ patient_puid: req.params.puid });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    req.body.patient_id = patient._id;
    req.body.patient_puid = patient.patient_puid;
    req.body.doctor_id = req.user.id;
    const patientVisit = new PatientVisit(req.body);
    const newVisit =await patientVisit.save();
    return res.json({ message: "Patient Visit Created", _id : newVisit._id });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/:id/history", async function (req, res) {
  try {
    const patient = await PatientVisit.findOne({ _id: req.params.id });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    patient.visit_reason = req.body.visit_reason;
    patient.visit_diagnosis = req.body.visit_diagnosis;
    patient.visit_prescription = req.body.visit_prescription;
    patient.visit_notes = req.body.visit_notes;
    patient.nextVisit = req.body.nextVisit;
    patient.status = req.body.status;
    await patient.save();

    return res.json({ message: "Patient Visit Edited" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:id/history",async (req,res) => {
  try {
    const patient = await PatientVisit.findOne({ _id: req.params.id });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    await PatientVisit.deleteOne({ _id: req.params.id });
    return res.json({ message: "Patient Deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
})

module.exports = router;
