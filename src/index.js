const cors = require('cors');
const express = require('express');
//const convertRouter = require('./routes/convert'); // Changed the import path
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
var logger = require('morgan');
var createError = require('http-errors');

var jsonmapper = require("./routes/jsonmapper.js");
const app = express();


app.use(cors());
app.use(express.json());
app.use(jsonmapper);

//app.use('/convert', convertRouter);

const PORT = 3020;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
