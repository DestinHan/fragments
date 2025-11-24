# Lab 9 – S3 storage test

# Create text fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

base64,SGVsbG8gUzMgc3RvcmFnZSE=;

HTTP/1.1 201
[Captures]
  url: header "Location"

# Retrieve from storage (S3)
GET {{url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP/1.1 200
[Asserts]
  header "Content-Type" matches /^text\/plain(?:;.*)?$/
  body == "Hello S3 storage!"

# Delete fragment
DELETE {{url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP/1.1 200

# Ensure 404 after deletion
GET {{url}}
Authorization: Basic dXNlcjFAZW1haWwuY29tOnBhc3N3b3JkMQ==

HTTP/1.1 404
