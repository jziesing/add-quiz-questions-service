/*
 * @index.js
 */
"use strict";


let AWS = require("aws-sdk"),
    Kafka = require('no-kafka');

var s3  = new AWS.S3({
  accessKeyId: process.env.HDRIVE_S3_ACCESS_KEY,
  secretAccessKey: process.env.HDRIVE_S3_SECRET_KEY,
  region: 'us-east-1'
});

var consumer = new Kafka.SimpleConsumer({
    connectionString: process.env.KAFKA_URL,
    ssl: {
        cert: process.env.KAFKA_CLIENT_CERT,
        key: process.env.KAFKA_CLIENT_CERT_KEY
    }
});


// data handler function can return a Promise
var dataHandler = function (messageSet, topic, partition) {
    messageSet.forEach(function (m) {
        console.log(topic, partition, m.offset, m.message.value.toString('utf8'));
    });
};

return consumer.init().then(function () {
    // Subscribe partitons 0 and 1 in a topic:
    return consumer.subscribe('licking-49744.add_qs_ms', [0, 1], dataHandler);
});
