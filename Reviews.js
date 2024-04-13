var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.connect(process.env.DB);

// Review schema
var ReviewSchema = new Schema({
    movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true }, // Reference to the Movie collection
    username: { type: String, required: true },
    review: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 }
});

// Return the model
module.exports = mongoose.model('Review', ReviewSchema);
