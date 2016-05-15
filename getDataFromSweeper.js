'use strict';
var getDataFromSweeper = (function () {
	
	var AWS = require( "aws-sdk" ),
		Q = require( "q" ),
		chalk = require( "chalk" ),
		request = require( "request" ),
		config = require( "./config.json" ),
		gotData = false,
		dataPayload = '',
		msgReceipt = '';

	AWS.config.loadFromPath(__dirname + '/config.json');

	var sqs = new AWS.SQS({
		params: {
			QueueUrl: "https://sqs.us-east-1.amazonaws.com/863554537735/completedSweeperJobs"
		}
	});
	
    return {
		
		// use API call to send a message to the requestToSweeper queue asking for data, then monitor
		// the completedSweeperJobs queue and get the message containing the JSON payload of requested data
		getData: function (gdun, reqType, session, callback) {
			
			console.log('session.attributes.requestInFlight = ' + session.attributes.requestInFlight);
			
			var receiveMessage = Q.nbind( sqs.receiveMessage, sqs );
			var deleteMessage = Q.nbind( sqs.deleteMessage, sqs );

			// if we have not yet a message to the requestToSweeper queue asking for data, do that:
			if (session.attributes.requestInFlight == false) {
				// build the URL for the API call to ask for data
				var url = buildApiUrl( gdun, reqType );

				// call Sweeper to go get the data and post it to completedSweeperJobs queue
				var results = callSweeper( url, function(results) {
					console.log( chalk.green('results = ' + results) );
					session.attributes.requestInFlight = true;
				});				
			}


			// now start looking for the message with the data
			(function pollQueueForMessages() {

				console.log( chalk.yellow( "Starting long-poll operation." ) );
				receiveMessage({
					WaitTimeSeconds: 10, // Enable long-polling
					VisibilityTimeout: 10,
					MessageAttributeNames: ["All"]
				})
				.then(
					function handleMessageResolve( data ) {
						if ( ! data.Messages ) {

							throw(
								workflowError(
									"EmptyQueue",	
									new Error( "There are no messages to process." )
								)
							);
						}
						console.log( chalk.green( "Data payload found: " ) );
						dataPayload = JSON.parse(data.Messages[0].Body);
						msgReceipt = data.Messages[0].ReceiptHandle;
						
						//console.log( chalk.green( "Data payload: " + JSON.stringify(dataPayload) ) );						
						gotData = true;
						
						var resultPayload = {
							gotData: true,
							dataPayload: dataPayload,
							MsgReceiptHandle: msgReceipt
						};
						// send the data payload back to the calling function in intentHandlers							
						callback(resultPayload);
					}
				)				
				.catch(
					function handleError( error ) {
						switch ( error.type ) {
							case "EmptyQueue":
								console.log( chalk.cyan( "Expected Error:", error.message ) );
								break;
							default:
								console.log( chalk.red( "Unexpected Error:", error.message ) );
								break;
						}
					}
				)
				.finally( 
					function isComplete() {
						if (gotData) {
							console.log('Got the data, now exiting getDataFromSweeper');
						} else {
							var resultPayload = {
								gotData: false,
							};
							callback(resultPayload);
						}
					}
				);

			})();

			function buildApiUrl(gdun, reqType) {				
				var url = 'https://mofpl68ftk.execute-api.us-east-1.amazonaws.com/prod/' + reqType + gdun;
				console.log( chalk.cyan( "This is a " + reqType + " request for customer with gdun:" + gdun ) );
				console.log( chalk.cyan( "URL = " + url ) );								
				return url;
			};

			function callSweeper( url, sweeperCallback ) {
			  console.log( chalk.cyan( "Making API call to:", url ) );
			  request(url, function (error, response, body) {
				if (error) { console.log( chalk.red( "There was an error:", error ) ); };
				if (!error) {
					sweeperCallback(body);
				}
			  });
			}

			function workflowError( type, error ) {
				error.type = type;
				return( error );
			}
		}
	};
			
})();

module.exports = getDataFromSweeper;
