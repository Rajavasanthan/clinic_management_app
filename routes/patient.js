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
    console.log(req.body);
    const patient = new Patient(req.body);
    await patient.save();
    recordCounter.counter = recordCounter.counter + 1;
    await recordCounter.save();
    return res.json({
      message: "Patient Created",
      puid: req.body.patient_puid,
    });
  } catch (error) {
    console.log(error);
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
    const { patient_name, patient_phone_number, patient_puid, visit_date } = req.query;
    
    // If visit_date is provided, search in the PatientVisit collection
    if (visit_date) {
      // Parse the date to handle various date formats
      const searchDate = new Date(visit_date);
      
      // Set start and end of the day for the search
      const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
      
      // Build the query for PatientVisit
      const visitQuery = {
        nextVisit: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      };
      
      // Add patient_puid to the query if provided
      if (patient_puid) {
        visitQuery.patient_puid = patient_puid;
      }
      
      // Find visits matching the criteria and populate patient information
      const visits = await PatientVisit.find(visitQuery)
        .populate({
          path: 'patient_id',
          model: 'Patient',
          // Additional filtering on populated patient data if needed
          match: {
            ...(patient_name && { $text: { $search: patient_name } }),
            ...(patient_phone_number && { patient_phone_number })
          }
        })
        .lean();
      
      // Filter out visits where the patient doesn't match the criteria
      // This is needed because the match in populate doesn't exclude documents
      const filteredVisits = visits.filter(visit => visit.patient_id);
      
      // Format the response to be consistent with the patient search format
      const formattedResults = filteredVisits.map(visit => {
        // Get the patient data
        const patient = visit.patient_id;
        
        // Create a consistent response object
        return {
          _id: patient._id,
          patient_name: patient.patient_name,
          patient_puid: patient.patient_puid,
          patient_phone_number: patient.patient_phone_number,
          patient_email: patient.patient_email,
          patient_gender: patient.patient_gender,
          patient_age: patient.patient_age,
          patient_address: patient.patient_address,
          patient_emmergency_contact: patient.patient_emmergency_contact,
          patient_insurance_number: patient.patient_insurance_number,
          patient_blood_group: patient.patient_blood_group,
          patient_allergies: patient.patient_allergies,
          // Visit information
          visits: [visit], // Just include the current visit
          nextVisitDate: visit.nextVisit || null,
          nextVisitDetails: visit.nextVisit ? {
            visit_reason: visit.visit_reason,
            doctor_id: visit.doctor_id
          } : null,
          lastVisitDate: visit.visit_date,
          lastVisitDiagnosis: visit.visit_diagnosis
        };
      });
      
      return res.json({
        success: true,
        count: formattedResults.length,
        data: formattedResults
      });
    } 
    // If no visit_date is provided, search directly in the Patient collection
    else {
      // Build the query for Patient
      const patientQuery = {};
      
      if (patient_name) {
        patientQuery.$text = { $search: patient_name };
      }
      
      if (patient_phone_number) {
        patientQuery.patient_phone_number = patient_phone_number;
      }
      
      if (patient_puid) {
        patientQuery.patient_puid = patient_puid;
      }
      
      // Find patients matching the criteria and populate their visits
      const patients = await Patient.find(patientQuery)
        .populate({
          path: 'visits',
          model: 'PatientVisit',
          // Sort to get the most recent visits first
          options: { sort: { visit_date: -1 } }
        })
        .lean();
        
      // Enhance patient data with next visit information
      patients.forEach(patient => {
        // Initialize default values
        patient.nextVisitDate = null;
        patient.nextVisitDetails = null;
        
        if (patient.visits && patient.visits.length > 0) {
          // Get future visits (any visit with a nextVisit date in the future)
          const futureVisits = patient.visits
            .filter(visit => visit.nextVisit && new Date(visit.nextVisit) > new Date())
            .sort((a, b) => new Date(a.nextVisit) - new Date(b.nextVisit));
          
          // Get the upcoming visit (the one that will happen next)
          const upcomingVisit = futureVisits.length > 0 ? futureVisits[0] : null;
          
          if (upcomingVisit) {
            patient.nextVisitDate = upcomingVisit.nextVisit;
            patient.nextVisitDetails = {
              visit_reason: upcomingVisit.visit_reason,
              doctor_id: upcomingVisit.doctor_id,
              // Include any other relevant fields from the visit
            };
          }
          
          // Also find the most recent visit (for reference)
          const mostRecentVisit = patient.visits
            .filter(visit => visit.visit_date)
            .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0];
            
          if (mostRecentVisit) {
            patient.lastVisitDate = mostRecentVisit.visit_date;
            patient.lastVisitDiagnosis = mostRecentVisit.visit_diagnosis;
          }
        }
      });
      
      return res.json({
        success: true,
        count: patients.length,
        data: patients
      });
    }
  } catch (error) {
    console.error('Error searching patients:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while searching patients',
      error: error.message
    });
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
    const newVisit = await patientVisit.save();
    patient.visits.push(newVisit._id);
    await patient.save();
    return res.json({ message: "Patient Visit Created", _id: newVisit._id });
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

router.delete("/:id/history", async (req, res) => {
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
});

module.exports = router;
