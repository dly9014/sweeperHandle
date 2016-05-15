
'use strict';
console.log('entering SQSHelper.js');
var AWS = require("aws-sdk");

var SQSHelper = (function () {

	var sqs = new AWS.SQS();
    return {
        deleteMessage: function (msgHandle, callback) {

			var params = {
			  QueueUrl: 'https://sqs.us-east-1.amazonaws.com/863554537735/completedSweeperJobs',
			  ReceiptHandle: msgHandle
			};
			
			sqs.deleteMessage(params, function(err, data) {
			  if (err) console.log(err, err.stack); // an error occurred
			  else     console.log(data);           // successful response
			  callback();
			});					
        }	
    };		

})();
console.log('exiting SQSHelper.js');
module.exports = SQSHelper;