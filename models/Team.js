import mongoose from 'mongoose';

const teamChiefsSchema = new mongoose.Schema({
  team_principal: String,
  technical: [String]
}, { _id: false });

const baseSchema = new mongoose.Schema({
  location: String,
  country: String
}, { _id: false });

const statsTeamSchema = new mongoose.Schema({
  first_entry: Date,
  world_championships: Number,
  highest_race_finish: Number,
  pole_positions: Number,
  fastest_laps: Number
}, { _id: false });

const teamImagesSchema = new mongoose.Schema({
  car: String,
  general: [String]
}, { _id: false });

const teamSchema = new mongoose.Schema({
  _id: String,
  base: String,
  chassis: String,
  chiefs: teamChiefsSchema,
  drivers: [String],
  fullname: String,
  logo: String,
  name: String,
  points: {
    type: Number,
    default: null
  },
  power_unit: String,
  stats: statsTeamSchema,
  team_color: String,
  team_images: teamImagesSchema
});

const Team = mongoose.model('Team', teamSchema, 'teams');
export default Team;
