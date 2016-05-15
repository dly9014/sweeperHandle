
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
				if (err) { // an error occurred
					var result = {
						error: true,
						data: err
					};					
					console.log(err, err.stack);   
				} else { // successful response
					var result = {
						error: false,
						data: data
					};						
					console.log(data);           
				}    
				// send the callback to the calling function in intentHandlers							
				callback(result);			  
			});					
        }	
    };		

})();
console.log('exiting SQSHelper.js');
module.exports = SQSHelper;