const mongoose = require("mongoose");

const RecordCounterSchema = new mongoose.Schema({
  counter: {
    type: Number,
    required: true,
  },
  type : {
    type: String,
    required: true,
  }
});

const RecordCounter = mongoose.model("RecordCounter", RecordCounterSchema);

module.exports = { RecordCounter };
