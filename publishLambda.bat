del askForData.zip 
7z a -r askForData.zip *
aws lambda update-function-code --function-name askForData --zip-file fileb://askForData.zip
