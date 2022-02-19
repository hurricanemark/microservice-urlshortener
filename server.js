require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose")
const app = express();
const bodyParser = require("body-parser");
const dns = require('dns');
const urlParser = require('url-parse');

// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser : true, useUnifiedTopology : true});
console.log(mongoose.connection.readyState);

const schema = new mongoose.Schema({ url_ori: 'string', hostname: 'string' });
const Url = mongoose.model('Url', schema);

app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


/*
You can POST a URL to /api/shorturl and get a JSON response with original_url and short_url properties. Here's an example: { original_url : 'https://freeCodeCamp.org', short_url : 1}

When you visit /api/shorturl/<short_url>, you will be redirected to the original URL.

If you pass an invalid URL that doesn't follow the valid http://www.example.com format, the JSON response will contain { error: 'invalid url' }
*/
// Given originalUrl, return shortUrl e.g. _id
app.post("/api/shorturl", function(req, res) {
  
  const bodyUrl = req.body.url
  const hostName = urlParser(bodyUrl).hostname;
  console.log(bodyUrl);
  console.log("hostname: ", hostName);

  const lookupResolution = dns.lookup(hostName, function(err, address) {
    if (err){ res.json({ error: 'invalid url'})}
    else {
      const ori_url = new Url({ url_ori: bodyUrl, hostname: hostName })
      ori_url.save((err, data) => {
        console.log("data: ", data, "bodyURL: ", bodyUrl);
        res.json({ original_url : data.url_ori, short_url : data.id})
      })
    }
    console.log("address: ", address);
  })
  console.log("dnslookup resolution: ", lookupResolution)

});

// Retrieve and redirect given shortUrl
app.get("/api/shorturl/:id", function(req, res) {
  const id = req.params.id
  Url.findById(id, function(err, result) {
    if (err) {
      res.json({ error: 'invalid url'});
    } else {
      res.redirect(result.url_ori);
    }
  })
})


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
