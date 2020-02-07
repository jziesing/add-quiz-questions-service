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


async function fetchFileProduceKafkaMsgs(keyURL) {
    // get csv file and create stream
    console.log('keyURL');
    console.log(keyURL);
    const stream = s3.getObject({Bucket: 'quiz-playground', Key: keyURL}).createReadStream();
    // convert csv file (stream) to JSON format data
    const json = await csv().fromStream(stream);

    var newjson = json.map((data, index) => {
        console.log('data');
        console.log(data);
        console.log(JSON.stringify(data));
        return {
            topic: 'licking-49744.new_question',
            partition: 0,
            message: {
                value: JSON.stringify(data)
            }
        }
    });
    console.log(newjson[0]);

    producer.init().then(function() {
        producer.send(newjson);
    }).then(function(result) {
        console.log('kafka result');
        console.log(result);
    });
};


// data handler function can return a Promise
var dataHandler = (messageSet, topic, partition) => {
    messageSet.forEach((m) => {
        console.log(topic, partition, m.offset, m.message.value.toString('utf8'));
        fetchFileProduceKafkaMsgs(m.message.value.toString('utf8'));
    });
};

// var testDataHandler = (messageSet, topic, partition) => {
//     messageSet.forEach((m) => {
//         console.log('consummmeddd');
//         console.log(topic, partition, m.offset, m.message.value.toString('utf8'));
//     });
// };
//  && consumer.subscribe('licking-49744.new_question', [0], testDataHandler)

return consumer.init().then(() => {
    // Subscribe partitons 0 and 1 in a topic:
    return consumer.subscribe('licking-49744.add_qs_ms', [0], dataHandler);
});
