const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
var _ = require('lodash');

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

require('dotenv').config()

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))
 
// parse application/json
app.use(bodyParser.json());
app.use(bodyParser.raw());


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const { Schema } = mongoose;

const userSchema = new Schema({
  username: { type:String, required: true},
});

const excersiseSchema = new Schema({
  user_id: { type:String, required: true},
  description: { type:String, required: true },
  duration: { type:Number, required: true },
  created_at: { type:Date, required: true }
});


let User;
User = mongoose.model('User', userSchema);

let Exercise;
Exercise = mongoose.model('Exercise', excersiseSchema);


app.get('/api/users', function(req, res) {
  User.find({}, function(err, users) {
     
      if (err) res.send({ error: err});
      
      if (users.length > 0) {
        const usersFormatted = users.map(user => {
          return {
            _id: user._id.toString(),
            username: user.username,
            __v: user.__v
          };
        });
        res.json(usersFormatted);
      } else {
        res.send({ message: "No available users"});
      }
  });
}).post('/api/users', function(req, res) {

  const submittedUsername = req.body.username;

  if (!submittedUsername) res.send({ error: "Provide a username"});

  const user = new User({username:submittedUsername});
        
  user.save(function(err, data) {
    if (err) {
      console.log(err);
      res.send({ error: err});
    }
    console.log(data);
    res.send({ username: data.username, _id: data._id });
  });
});

app.post('/api/users/:_id/exercises', function(req, res) {

  const submittedUserId = req.params._id;
  const description  = req.body.description;
  const duration = req.body.duration;
  const dateSubmitted = req.body.date;

  if (!submittedUserId || !description || !duration ) {
    console.log(req.params + " " + req.body);
    res.send({ error: "Provide required field value"});
  };

  User.findById(submittedUserId, function(err, userExists) {
    if (err) res.send({error : err});

    if (userExists !== null) {
    
      const exercise = new Exercise({
                          user_id: submittedUserId, 
                          description: description, 
                          duration: duration, 
                          created_at: _.isEmpty(dateSubmitted) ? new Date().toDateString() : dateSubmitted });
        
      exercise.save(function(err, data) {
        if (err) {
          console.log(err);
          res.send({ error: err});
        }
      
        res.send({ 
          _id: userExists._id, 
          username: userExists.username, 
          date: new Date(data.created_at).toDateString(),
          duration : data.duration, 
          description : data.description 
        });
      });
      
    } else {
      console.log(userExists);
      res.send({ error: "Provide user is not available"});
    }

  });
});

app.get('/api/users/:id/logs', function(req, res, next) {

  const userId = req.params.id;
  const startDate = req.query.from;
  const endDate = req.query.to;
  const submittedLimit = _.isEmpty(req.query.limit) ? {} : parseInt(req.query.limit);

  let filter= {
    user_id: userId
    };

  if (!_.isEmpty(req.query.from) && !_.isEmpty(req.query.to)) {
    filter.created_at = {
        $gte: startDate, 
        $lte: endDate
      };
  }  

  Exercise.find(filter)
      .limit(submittedLimit) 
      .exec(function(err, results) {
        if (err) res.send({error : err});

        if (results.length > 0) {

          User.findById( userId, function(err, userExists) {

            if (err) res.send({error : err});

            if (userExists !== null) {
              const logsArray = results.map(log => {

                console.log("Reading this" + log);
                                  return {
                                    description : log.description,
                                    duration : parseInt(log.duration),
                                    date: new Date(log.created_at).toDateString()
                                  }
                                });

                  res.send({
                      username: userExists.username,
                      count: results.length,
                      _id: userExists._id,
                      log:logsArray
                    
                  });
            } else {
              res.send({ message: "No such user available"});
            }
        });
      } else {
        res.send({ message: "No exercises for the user"});
      }
    });
});




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
