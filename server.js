const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');

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
  date: { type:Date, required: true }
});


let User;
User = mongoose.model('User', userSchema);

let Exercise;
Exercise = mongoose.model('Exercise', excersiseSchema);


app.post('/api/users', function(req, res) {

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
}).get('/api/users', function(req, res) {
  User.find({}, function(err, results) {
      if (!err) res.send({ error: err});
      
      if (results.length > 0)  {
        res.send(results);
      } else {
        res.send({ message: "No available users"});
      }
  });
});

app.post('/api/users/:_id/exercises', function(req, res) {

  const submittedUserId = req.params._id;
  const description  = req.body.description;
  const duration = req.body.duration;
  const date = req.body.date;

  if (!submittedUserId || !description || !duration ) {
    console.log(req.params + " " + req.body);
    res.send({ error: "Provide required field value"});
  };

  User.findById(submittedUserId, function(err, userExists) {
    if (err) res.send({error : err});

    if (userExists !== null) {
      console.log("here " + userSchema);
      const exercise = new Exercise({
                          user_id: submittedUserId, 
                          description: description, 
                          duration: duration, 
                          date: date === ""? new Date().toISOString().substring(0, 10) : date });
        
      exercise.save(function(err, data) {
        if (err) {
          console.log(err);
          res.send({ error: err});
        }
      
        res.send({ 
          _id: submittedUserId, 
          username: userExists.username, 
          date: data.date,
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

  User.findOne({_id: userId}, function(err, userExists) {
    if (err) res.send({error : err});

    if (userExists !== null) {

      Exercise.find({user_id: userId}, function(err, results) {
        if (err) res.send({error : err});

        if (results.length > 0) {
          res.send({
            _id: userExists._id,
            username: userExists.username,
            count: results.length,
            log: results
          });
        } else {
          res.send({ message: "No exercises for the user"});
        }
      });
    } else {
      res.send({ message: "No such user available"});
    }
  });

});




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
