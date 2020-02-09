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


async function fetchFileProduceKafkaMsgs(msgData) {
    // get csv file and create stream
    let newMsgData = JSON.parse(msgData);
    let keyURL = newMsgData.file_path;
    let quiz_sfid = newMsgData.quiz_sfid;
    console.log('keyURL');
    console.log(keyURL);
    const stream = s3.getObject({Bucket: 'quiz-playground', Key: keyURL}).createReadStream();
    // convert csv file (stream) to JSON format data
    const json = await csv().fromStream(stream);

    var newjson = json.map((data, index) => {
        console.log('data');
        console.log(data);
        let formattedQuestionData = {
                            "schema": {
                                "type": "struct",
                                "fields": [
                                    {
                                        "type": "string",
                                        "optional": false,
                                        "field": "question__c"
                                    },
                                    {
                                        "type": "string",
                                        "optional": false,
                                        "field": "quiz__c"
                                    },
                                    {
                                        "type": "int64",
                                        "optional": false,
                                        "field": "correct_answer__c"
                                    },
                                    {
                                        "type": "string",
                                        "optional": false,
                                        "field": "answer_1__c"
                                    },
                                    {
                                        "type": "string",
                                        "optional": false,
                                        "field": "answer_2__c"
                                    },
                                    {
                                        "type": "string",
                                        "optional": false,
                                        "field": "answer_3__c"
                                    },
                                    {
                                        "type": "string",
                                        "optional": false,
                                        "field": "answer_4__c"
                                    },
                                    {
                                        "type": "string",
                                        "optional": false,
                                        "field": "answer_5__c"
                                    },
                                    {
                                        "type": "string",
                                        "optional": false,
                                        "field": "answer_6__c"
                                    }
                                ],
                                "optional": false,
                                "name": "ksql.users"
                            },
                            "payload": {
                                "question__c": data.question,
                                "quiz__c": quiz_sfid,
                                "correct_answer__c": data.correct_answer,
                                "answer_1__c": data.answer1,
                                "answer_2__c": data.answer2,
                                "answer_3__c": data.answer3,
                                "answer_4__c": data.answer4,
                                "answer_5__c": data.answer5,
                                "answer_6__c": data.answer6
                            }
                        };

        // console.log(JSON.stringify(formattedQuestionData));
        return {
            topic: 'new_question',
            partition: 0,
            message: {
                value: JSON.stringify(formattedQuestionData)
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

var testDataHandler = (messageSet, topic, partition) => {
    messageSet.forEach((m) => {
        console.log('consummmeddd');
        console.log(topic, partition, m.offset, m.message.value.toString('utf8'));
    });
};
//  && consumer.subscribe('new_question', [0], testDataHandler)

return consumer.init().then(() => {
    // Subscribe partitons 0 and 1 in a topic:
    return consumer.subscribe('add_qs_ms', [0], dataHandler) && consumer.subscribe('new_question', [0], testDataHandler);
});
