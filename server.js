require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose")
const app = express();
const bodyParser = require("body-parser");
const dns = require('dns');
const urlParser = require('url-parse');
//const chalk = require("chalk");

// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser : true, useUnifiedTopology : true});

if (mongoose.connection.readyState == 2) {
  console.log("Connected to mongodb server\n");
} else
  console.log("Failed to login to database.");

const schema = new mongoose.Schema({ url_ori: 'string', hostname: 'string', ip_address: 'string' });
const Url = mongoose.model('Url', schema);

app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});



var data = { provider: 'dns' };
const urlToLookup = urlParser('http://www.example.com').hostname;
const dnsLookup = dns.lookup(urlToLookup, function (err, address, family) {
    data.err = err;
    if (err && err.code === dns.NOTFOUND) {
      console.log("error: ", data.err);
    } else if (err) {
      console.log(err);
    } else {
      console.log("Data: ", data);
    }
  
    data.address = address;
    data.family = family;
    console.log("Addr: ", data.address, "\tFamily: ", data.family);
  });

/*
You can POST a URL to /api/shorturl and get a JSON response with original_url and short_url properties. Here's an example: { original_url : 'https://freeCodeCamp.org', short_url : 1}

When you visit /api/shorturl/<short_url>, you will be redirected to the original URL.

If you pass an invalid URL that doesn't follow the valid http://www.example.com format, the JSON response will contain { error: 'invalid url' }
*/
// Given originalUrl, perform dns lookup, save to mongodb and return DbCollection _id i.e. ObjectId
app.post("/api/shorturl",  function(req, res) {
  console.log(req.body);
  const bodyUrl = req.body.url
  const hostName = urlParser(bodyUrl).hostname;
  console.log("urlParseBody:" , urlParser(bodyUrl));
  
  console.log("hostname: ", hostName);

  const lookupResolution = dns.lookup(hostName, function(err, address, family) {
    if (err || !address){ res.json({ error: 'invalid url' })}
    else {
      
      Url.findOneAndUpdate(
        {url_ori: bodyUrl},
        {url_ori: bodyUrl, hostname: hostName, ip_address: address}, 
        {new: true, upsert: true}, 
        (err, result) => {
        if (err) { res.json({ error: 'invalid url'})}
        else {
          res.json({ original_url : result.url_ori, short_url : result.id})
        }
      })
    }
    console.log("ip_address: ", address);
  })
  //console.log("dnslookup resolution: ", lookupResolution)

});

// Retrieve and redirect given shortUrl
app.get("/api/shorturl/:id", function(req, res) {
  const idForShort = req.params.id
  Url.findById(idForShort, function(err, result) {
    if (err) {
      res.json({ error: 'invalid url' });
    } else {
      res.redirect(result.url_ori);
    }
  })
})


app.listen(port, function() {
  console.log(`Microservice server is listening on port ${port}`);
});
