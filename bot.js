/*!
* FirstBugBot : A Twitter bot that tweets github issues labeld 'Good First Bug'.
* Version 1.0.0
* Created by Dominic Magnifico (http://dommagnifi.co)
*/

require('dotenv').config();


var firebase = require("firebase");

var config = {
  apiKey: process.env.FIREBASE_APIKEY,
  authDomain: process.env.FIREBASE_AUTHDOMAIN,
  databaseURL: process.env.FIREBASE_DATABASEURL,
  projectId: process.env.FIREBASE_PROJECTID,
  storageBucket: process.env.FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGINGSENDERID
};
firebase.initializeApp(config);

const db = firebase.database();
const ref = db.ref('/');

var Twit = require('twit');
var maxlen = 78;
var tweeted = [];
var runCount = 0;

var Bot = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

console.log('The bot is running...');

/* BotInit() : To initiate the bot */
function BotInit() {
  BotTweet();
}

function BotTweet() {
  var request = require('request');
  var url = "https://api.github.com/search/issues?q=state:open+label:%22good+first+issue%22&sort=created";

  request({
    url: url,
    json: true,
    headers: { 'user-agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)' }
  }, function (error, response, body) {

    // If there are no erros with the request, and the file exists, proceed.
    if (!error && response.statusCode === 200) {

      let issues = body.items;
      let pos = 0;
      let idsToTweet = {};
      let builtTweets = [];

      issues.forEach(function (i) {
        const id = i.id;
        idsToTweet[pos] = id;
        pos++;
      });

      ref.child('tweeted').once('value', (snap) => {
        let snapVal = snap.val()
        for (let id in idsToTweet) {
          if (snap.val().includes(idsToTweet[id])) {
            console.log(idsToTweet[id] + ' has already been tweeted');
          } else {
            // Set some variables for the current bill.
            const issue = issues[id];
            const link = issue.html_url;
            const title = issue.title;
            const issueId = issue.id;

            if (title.length >= maxlen) {
              var truncTitle = title.substring(0, maxlen) + "...";
            } else {
              var truncTitle = title;
            }

            const tweetVariations = [
              `Fresh bug here! '${truncTitle}' ${link}`,
              `Looking for your first open source contribution? Try this! '${truncTitle}' ${link}'`,
              `No better time than now to tackle your first open source contribution! '${truncTitle}' ${link}`,
              `Open source thrives when you're able to contribute. Maybe this is a good issue for you! '${truncTitle}' ${link}`
            ]

            const tweet = tweetVariations[Math.floor(Math.random() * tweetVariations.length)];

            builtTweets.push(tweet);
            snapVal.push(issueId);
            console.log(snapVal);

            ref.set({
              tweeted: snapVal
            });
          }
        }

        // Delayed foreach function to not innundate twitter with tweets. No more 100 tweet dumps.
        Array.prototype.delayedForEach = function (callback, timeout, thisArg) {
          var i = 0,
            l = this.length,
            self = this,

            caller = function () {
              callback.call(thisArg || self, self[i], i, self);
              (++i < l) && setTimeout(caller, timeout);
            };

          caller();
        };

        function staggerTweet() {
          // Tweet each tweet, waiting 15 minutes between each.
          builtTweets.delayedForEach(function (tweet, index, array) {
            //Report number of tweets in the pipeline.
            console.log('There are ' + builtTweets.length + ' tweets queued.');
            console.log('**********************');
            const toTweet = array[0];
            // If there's something to tweet.
            if (toTweet !== undefined) {
              console.log(toTweet);
              Bot.post('statuses/update', { status: toTweet }, function (err, data, response) {
                if (toTweet) {
                  console.log('Tweeted: ' + toTweet);
                  console.log('**********************');
                }
                if (err) {
                  console.log(err);
                }
              });
            }
            builtTweets.splice(0, 1);
          }, 15 * 60 * 1000); //15 minutes
        }

        staggerTweet();
      });
    } else {
      console.log('error');
    }
  });

  console.log('Request sent. Iteration: ' + runCount);
  console.log('**********************');
  runCount++;

  //Check the JSON file every 24 hours.
  setInterval(BotTweet, 24 * 60 * 60 * 1000);

}

/* Initiate the Bot */
BotInit();