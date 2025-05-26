import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const lapRecordSchema = new Schema({
  time:     String,
  driver:   { type: Types.ObjectId, ref: 'Driver' },
  year:     Number,
}, { _id: false });

const mapTrackSchema = new Schema({
  black: String,
  white: String,
}, { _id: false });

const mapSchema = new Schema({
  track:   mapTrackSchema,
  circuit: String,
}, { _id: false });

const circuitSchema = new Schema({
  _id: String,
  country: {
    name: String,
    flag: String,
  },
  first_gp:     Date,
  lap_record:   lapRecordSchema,
  length:       Number,
  map:          mapSchema,
  name:         { type: String, required: true },
  number_of_laps: Number,
  official_name:  String,
  race_distance:  Number,
  questions:      { type: Map, of: String },
}, {
  collection: 'circuit',
  versionKey: false
});

export default mongoose.model('Circuit', circuitSchema);
