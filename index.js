
var AWS = require( "aws-sdk" );
var Q = require( "q" );
var chalk = require( "chalk" );
var request = require( "request" );
var config = require( "./config.json" );
var gotData = false;

AWS.config.loadFromPath(__dirname + '/config.json');

exports.handler = function (event, context) {

	var sqs = new AWS.SQS({
		params: {
			QueueUrl: "https://sqs.us-east-1.amazonaws.com/863554537735/completedSweeperJobs"
		}
	});

	var receiveMessage = Q.nbind( sqs.receiveMessage, sqs );
	var deleteMessage = Q.nbind( sqs.deleteMessage, sqs );

	// build the URL for the API call to ask for data
	//var url = buildApiUrl( msgBody );
	var url = 'https://mofpl68ftk.execute-api.us-east-1.amazonaws.com/prod/installbase/831703157';

	// call Sweeper to go get the data and post it to completedSweeperJobs queue
	var results = callSweeper( url, function(results) {
		console.log( chalk.green('results = ' + results) );
	});

	// now start looking for the message with the data
	(function pollQueueForMessages() {

		console.log( chalk.yellow( "Starting long-poll operation." ) );
		receiveMessage({
			WaitTimeSeconds: 2, // Enable long-polling (2-second)
			VisibilityTimeout: 4,
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

				var msgBody = JSON.parse(data.Messages[0].Body);
				console.log( chalk.green( "Results found!" ) );
				console.log( chalk.green( "msgBody = " + JSON.stringify(msgBody) ) );			
				gotData = true;
			}
		)
		.then(
			function handleDeleteResolve( data ) {

				/*** add the delete in later
				console.log( chalk.yellow( "Deleting:", data.Messages[ 0 ].MessageId ) );
				return(
					deleteMessage({
						ReceiptHandle: data.Messages[ 0 ].ReceiptHandle
					})
				);
				console.log( chalk.green( "Requesting message successfully deleted" ) );
				*/		
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
					console.log('successfully pulled the data');
				} else {
					pollQueueForMessages
				}
			}
		);

	})();

	function buildApiUrl(body) {
	  var resource = body["resource_path"].split("/")[1];
	  console.log(resource)
	  switch( resource ) {
		case "installbase":
		  console.log( chalk.cyan( "This is an install base call to gdun:", body.gdun ) );
		  return pnwreportUrl + "installs/" + body.gdun
		  break;
		default:
		  console.log ( chalk.red( "Not an install base call" ) );
	  }
	};

	function callSweeper( url, callback ) {
	  console.log( chalk.cyan( "Making API call to:", url ) );
	  request(url, function (error, response, body) {
		if (error) { console.log( chalk.red( "There was an error:", error ) ); };
		if (!error) {
			callback(body);
		}
	  });
	}

	function workflowError( type, error ) {
		error.type = type;
		return( error );
	}

};
