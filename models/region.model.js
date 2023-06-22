const mongoose = require('mongoose');

const regionDataSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true
  },
  hms: {
    type: Number,
    required: true,
    default: 0
  },
  field_coordinators: {
    type: Number,
    required: true,
    default: 0
  },
  hms_students: {
    type: Number,
    required: true,
    default: 0
  },
  teachers: {
    type: Number,
    required: true,
    default: 0
  },
  new_hms: {
    type: Number,
    required: true,
    default: 0
  },
  third_std_students: {
    type: Number,
    required: true,
    default: 0
  },
  qlm_centres: {
    type: Number,
    required: true,
    default: 0
  },
  talim_e_baligan_centres: {
    type: Number,
    required: true,
    default: 0
  },
  model_hms: {
    type: Number,
    required: true,
    default: 0
  },
  back_to_school_centres: {
    type: Number,
    required: true,
    default: 0
  },
  pre_schools: {
    type: Number,
    required: true,
    default: 0

  }
});

const RegionData = mongoose.model('RegionData', regionDataSchema);

module.exports = RegionData;
