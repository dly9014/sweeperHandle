del askForData.zip 
7z a -r askForData.zip *
aws lambda update-function-code --function-name askForData --zip-file fileb://askForData.zip
:: beep.bat makes the system speaker ding to alert that zip upload is complete
beep.bat

