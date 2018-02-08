const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars');

// Scraping tools
const axios = require('axios');
const cheerio = require('cheerio');

// DB info
const databaseURL = 'h18_scraper';

// Require all models
const db = require('./models');

const PORT = '3000';

// Setup Express App
const app = express();

// Configure middleware
app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Connect to mongoDB
mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost/hw18_scraper", {
  useMongoClient: true
});

// Routes
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

app.get('/articles', function(req, res, next) {
  db.Article.find({})
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(err) {
    res.json(err);
  });
});

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
app.listen(PORT, function() {
    console.log(`App running on ${PORT}!`);
});