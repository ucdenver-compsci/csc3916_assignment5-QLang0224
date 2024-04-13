var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.connect(process.env.DB);

const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  releaseDate: { type: Number, min: [1900, 'Must be greater than 1899'], max: [2100, 'Must be less than 2100']},
  genre: { type: String, enum: genres },
  actors: [ActorSchema],
  imageUrl: String,
});

module.exports = mongoose.model('Movie', MovieSchema);