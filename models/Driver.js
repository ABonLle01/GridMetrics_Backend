import mongoose from 'mongoose';

const careerSchema = new mongoose.Schema({
  teams: [String],
  first_race: String,
  first_victory: String,
  last_victory: String
}, { _id: false });

const imagesSchema = new mongoose.Schema({
  image_1: String,
  image_2: String,
  image_3: String
}, { _id: false });

const nameSchema = new mongoose.Schema({
  first: String,
  last: String
}, { _id: false });

const nationalitySchema = new mongoose.Schema({
  country: String,
  flag_image: String
}, { _id: false });

const statsSchema = new mongoose.Schema({
  podiums: Number,
  gp_entered: Number,
  world_championships: Number,
  highest_race_finish: Number,
  highest_grid_position: Number,
  total_points: Number,
  season_points: Number
}, { _id: false });

const driverSchema = new mongoose.Schema({
  _id: String,
  biography: String,
  birth: {
    date: String,
    place: String
  },
  car_number: Number,
  career: careerSchema,
  images: imagesSchema,
  name: nameSchema,
  nationality: nationalitySchema,
  profile_image: String,
  stats: statsSchema,
  team: String
});

const Driver = mongoose.model('Driver', driverSchema, 'drivers');
export default Driver;