

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
//include the express-session module
var session = require('express-session');

// Include the routing logic defined in the index.js module into the main application file app.js
var indexRouter = require('./routes/index'); 
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));         // sets up middleware to parse URL-encoded data, making it available in req.body
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//activate it as an express.js session
app.use(session({
  secret: 'YOUR_SECRET',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// connect the routing logic from indexRouter to the r-m "oot path. 
// This router will handle all requests that start with the root path of the application.
app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;


/*Start server

set DEBUG=MeteoBriefing:* & npm run devstart

*/

/* NOTAM API

Client ID: 04b1a2e24d574321bbc0263f4b53ac44
Client Secret: 5cd7d9d58c6A4D13A459e2C51904073c


// To Dos:
- Rename PDF to something like : MeteoBriefing_Date_Airports.pdf

*/
