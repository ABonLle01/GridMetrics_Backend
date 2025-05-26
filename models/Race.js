import mongoose from 'mongoose';

const sessionResultPositionSchema = new mongoose.Schema({
  driver: String,
  position: Number,
  total_time: String
}, { _id: false });

const sessionResultSchema = new mongoose.Schema({
  first: sessionResultPositionSchema,
  second: sessionResultPositionSchema,
  third: sessionResultPositionSchema
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  name: String,
  date: String,
  start_time: String,
  end_time: String,
  session_result: sessionResultSchema
}, { _id: false });

const raceResultSchema = new mongoose.Schema({
  driver: String,
  position: Number,
  total_time: String
}, { _id: false });

const raceSchema = new mongoose.Schema({
  _id: String,
  circuit: String,
  date: String,
  finished: Boolean,
  name: String,
  race_results: [raceResultSchema],
  sessions: [sessionSchema],
  winner: String,
  timeZone: String,
  round: Number,
});

const Race = mongoose.model('Race', raceSchema, 'races');
export default Race;
