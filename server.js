const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars');

// Scraping tools
const axios = require('axios');
const cheerio = require('cheerio');

// Require all models
const db = require('./models');

var port = process.env.PORT || '3000';


// Setup Express App
const app = express();

// Configure middleware
app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/hw18_scraper";

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI, {
  useMongoClient: true
});

// Routes
// Home page
app.get('/', function(req, res, next) {
  db.Article.find({}).then(function(data) {
    res.render('article', {articles: data});
  });
});
app.get('/scrape', function(req, res, next) {
  axios.get("https://news.google.com/news/?ned=us&gl=US&hl=en").then(function(response) {
  console.log("\n************************\n" +
              "Grabbing every title and link\n" +
              "from Google News:" +
              "\n************************\n");
              
    const $ = cheerio.load(response.data);

    $("div c-wiz").each(function(i, element) {
      let result = {};

      result.title = $(this)
      .children('a')
      .text();
      result.link = $(this)
      .children('a')
      .attr("href");
      result.saved = false;

      db.Article.create(result)
      .then(function(dbArticle) {
        console.log(dbArticle);
      })
      .catch(function(err) {
        return res.json(err);
      });
    });

    res.send("Scrape Complete" + "<br><a href='/'>Home</a>");
  });
});
// Saved page routes
app.route('/saved')
  .get(function(req, res, next) {
    res.render('saved');
  })
  .post(function(req, res, next) {
    
  });

// Articles API
app.get('/articles', function(req, res, next) {
  db.Article.find({})
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(err) {
    res.json(err);
  });
});

// Specific Article API
app.get('/articles/:id', function(req, res, next) {
  db.Article.findOne({_id: req.params.id})
  .populate("note")
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(err) {
    res.json(err);
  });
});

// Making a note route
app.post('/articles/:id', function(req, res, next) {
  db.Note.create(req.body)
  .then(function(dbNote) {
    return db.Article.findOneAndUpdate({_id: req.params.id}, {note: dbNote._id},{new:true});
  })
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(err) {
    res.json(err);
  });
});

// Port Listener
app.listen(port, function() {
    console.log(`App running on ${port}!`);
});