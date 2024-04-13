var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));  
app.use(passport.initialize());

var router = express.Router();

var SECRET_KEY = process.env.SECRET_KEY;

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.SECRET_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/reviews', verifyToken, (req, res) => {
    // Check if request body contains required fields
    if (!req.body.movieId || !req.body.username || !req.body.review || !req.body.rating) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const newReview = new Review({
        movieId: req.body.movieId,
        username: req.body.username,
        review: req.body.review,
        rating: req.body.rating
    });

    newReview.save()
        .then(review => {
            res.status(201).json({ success: true, message: 'Review created successfully.', review });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: 'Failed to create review.', error });
        });
});

router.get('/reviews', verifyToken, (req, res) => {
    Review.find()
        .then(reviews => {
            res.status(200).json({ success: true, reviews });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: 'Failed to retrieve reviews.', error });
        });
});

router.post('/movies', verifyToken, (req, res) => {
    // Check if request body contains required fields
    if (!req.body.title || !req.body.releaseDate || !req.body.genre || !req.body.actors) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    const newMovie = new Movie({
        title: req.body.title,
        releaseDate: req.body.releaseDate,
        genre: req.body.genre,
        actors: req.body.actors
    });

    newMovie.save()
        .then(movie => {
            res.status(201).json({ success: true, message: 'Movie created successfully.', movie });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: 'Failed to create movie.', error });
        });
});

router.get('/movies/:id', (req, res) => {
    Movie.findById(req.params.id)
        .then(movie => {
            if (!movie) {
                return res.status(404).json({ success: false, message: 'Movie not found.' });
            }
            res.status(200).json({ success: true, movie });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: 'Failed to retrieve movie.', error });
        });
});

router.get('/movies', verifyToken, (req, res) => {
    if (req.query.reviews === 'true') {
    Movie.aggregate([
        {
            $lookup: {
                from: 'reviews',
                localField: '_id',
                foreignField: 'movieId',
                as: 'movieReviews'
            }
        },
        {
            $addFields: {
                avgRating: { $avg: '$movieReviews.rating' }
            }
        },
        {
            $sort: { avgRating: -1 }
        }
    ]).exec(function(err, movies) {
        if (err) {
            res.status(500).json({ success: false, message: 'Failed to retrieve movies.', error: err });
        } else {
            res.status(200).json({ success: true, movies });
        }
    });
    }
});

router.put('/movies/:id', (req, res) => {
    Movie.findByIdAndUpdate(req.params.id, req.body, { new: true })
        .then(movie => {
            if (!movie) {
                return res.status(404).json({ success: false, message: 'Movie not found.' });
            }
            res.status(200).json({ success: true, message: 'Movie updated successfully.', movie });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: 'Failed to update movie.', error });
        });
});

router.delete('/movies/:id', (req, res) => {
    Movie.findByIdAndDelete(req.params.id)
        .then(movie => {
            if (!movie) {
                return res.status(404).json({ success: false, message: 'Movie not found.' });
            }
            res.status(200).json({ success: true, message: 'Movie deleted successfully.' });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: 'Failed to delete movie.', error });
        });
});

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

function verifyToken(req, res, next) {
    var token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ success: false, msg: 'No token provided.' });
    }
    jwt.verify(token.split(' ')[1], SECRET_KEY, function(err, decoded) {
        if (err) {
            return res.status(500).json({ success: false, msg: 'Failed to authenticate token.' });
        }
        req.userId = decoded.id;
        next();
    });
}

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app;
