var express = require("express");
const { Patient } = require("../models/patient");
const { RecordCounter } = require("../models/record_counter");
const { PatientVisit } = require("../models/patient_visits");
var router = express.Router();

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
    const patient_name = req.query.name;
    const patient_phone_number = req.query.phone;
    const patient_puid = req.query.puid;

    if (patient_phone_number || patient_puid) {
      const patient = await Patient.findOne({
        $or: [
          { patient_phone_number: patient_phone_number },
          { patient_puid: patient_puid },
        ],
      });
      return res.json(patient);
    } else {
      const patient = await Patient.find({
        $text: { $search: patient_name },
      });
      return res.json(patient);
    }
  } catch (error) {
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
    await patientVisit.save();
    return res.json({ message: "Patient Visit Created" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
