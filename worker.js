/*
 * @index.js
 */
"use strict";


let AWS = require("aws-sdk"),
    Kafka = require('no-kafka'),
    csv = require('csvtojson');;

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

var producer = new Kafka.Producer({
    connectionString: process.env.KAFKA_URL,
    ssl: {
        cert: process.env.KAFKA_CLIENT_CERT,
        key: process.env.KAFKA_CLIENT_CERT_KEY
    }
});


async function csvToJSON(keyURL) {
    // get csv file and create stream
    console.log('keyURL');
    console.log(keyURL);
    const stream = s3.getObject({Bucket: 'quiz-playground', Key: keyURL}).createReadStream();
    // convert csv file (stream) to JSON format data
    const json = await csv().fromStream(stream);
    var msgs =  [];
    var newjson = json.map((data, index) => {
        return {
            topic: 'licking-49744.new_question',
            partition: 0,
            message: {
                value: JSON.stringify(data)
            }
        }
    });
    console.log(newjson);
    producer.send(newjson);
    producer.init().then(function() {
                        producer.send(newjson[0]);
                    }).then(function(result) {
                        console.log('kafka result');
                        console.log(result);
                    });
};


// data handler function can return a Promise
var dataHandler = (messageSet, topic, partition) => {
    messageSet.forEach((m) => {
        console.log(topic, partition, m.offset, m.message.value.toString('utf8'));
        csvToJSON(m.message.value.toString('utf8'));
    });
};

return consumer.init().then(() => {
    // Subscribe partitons 0 and 1 in a topic:
    return consumer.subscribe('licking-49744.add_qs_ms', [0], dataHandler);
});
