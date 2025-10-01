GET http://localhost:8080

HTTP/1.1 200
Cache-Control: no-cache

[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.author" == "Seung Hoon Han"
jsonpath "$.githubUrl" == "https://github.com/DestinHan/fragments"
jsonpath "$.version" matches "^[0-9]+\\.[0-9]+\\.[0-9]+$"
