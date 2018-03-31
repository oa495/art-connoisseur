/* Setting things up. */
var path = require('path'),
    express = require('express'),
    app = express(),   
    request = require('request'),
    rp = require('request-promise'),
    fs = require('fs'),
    Twit = require('twit'),
    tracery = require('tracery-grammar'),
    rawGrammar = require('./grammar.json'), // the grammar for the bot, edit this!
    grammar = tracery.createGrammar(rawGrammar),
    config = {
    /* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/how-to-create-a-twitter-app */      
      twitter: {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
      }
    },
    T = new Twit(config.twitter);

app.use(express.static('public'));
grammar.addModifiers(tracery.baseEngModifiers); 

function generateStatus(title, year) {
  // Generate a new tweet using our grammar
  return `${title}, ${year} \nme: ${grammar.flatten("#origin#")}`; // make sure an "origin" entry is in your grammar.json file
}

/* You can use uptimerobot.com or a similar site to hit your /BOT_ENDPOINT to wake up your app and make your Twitter bot tweet. */
const download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

const tweet = function(status, title) {
 const b64content = fs.readFileSync('./img.jpg', { encoding: 'base64' });
  T.post('media/upload', { media_data: b64content }, function (err, data, response) {
      // now we can assign alt text to the media, for use by screen readers and
      // other text-based presentations and interpreters
      var mediaIdStr = data.media_id_string;
      var altText = `From Artsy: ${title}`;
      var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } };

      T.post('media/metadata/create', meta_params, function (err, data, response) {
          if (!err) {
              // now we can reference the media and post a tweet (media will attach to the tweet)
              var params = { status, media_ids: [mediaIdStr] };

              T.post('statuses/update', params, function (err, data, response) {
                  console.log(data);
              });
          }
      })
  });
}

const generateTweet = function() {
  request.get({
   url: 'https://api.artsy.net/api/artworks?sample',
   headers: { 
      'X-Xapp-Token': process.env.ARTSY_TOKEN,
      'Accept': 'application/vnd.artsy-v2+json'
   }
  },
  function (e, r, body) {
    let json = JSON.parse(body);
    const title = json.title;
    const date = json.date;
    const status = generateStatus(title, date);
    const imgUrl = json['_links'].thumbnail.href;
    download(imgUrl, 'img.jpg', function(){
        console.log('img saved to img.jpg');
        tweet(status, title);
    });
  });
}

app.all("/" + process.env.BOT_ENDPOINT, function (req, res) {
  generateTweet();
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your bot is running on port ' + listener.address().port);
});
