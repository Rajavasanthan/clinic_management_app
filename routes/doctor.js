var express = require("express");
var router = express.Router();
const bcrypt = require("bcryptjs");
const { Doctor } = require("../models/doctor");
const jwt = require("jsonwebtoken");
router.post("/register", async function (req, res) {
  try {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt);
    req.body.password = hash;
    const doctor = new Doctor({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      medicalId: req.body.medicalId,
    });
    await doctor.save();
    return res.json({ message: "Doctor Rrgistered Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/login", async function (req, res) {
  try {
    const doctor = await Doctor.findOne({ email: req.body.email });
    if (!doctor) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }
    const isValid = bcrypt.compareSync(req.body.password, doctor.password);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }
    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET);
    return res.json({ message: "Login Success", token: token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
