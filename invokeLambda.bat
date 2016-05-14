aws lambda invoke --function-name askForData --invocation-type RequestResponse --log-type Tail --profile emc-api-user --region us-east-1 outputfile.txt > log.txt
type log.txt | jq -r ".LogResult" > logResult.txt
del decodedLog.txt 
certutil -decode logResult.txt decodedLog.txt
"C:\Program Files (x86)\Notepad++\notepad++" decodedLog.txt


