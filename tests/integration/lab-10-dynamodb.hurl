# Lab 10 – DynamoDB metadata test

POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=
Content-Type: application/json

{ "service": "DynamoDB" }

HTTP/1.1 201
[Captures]
  fragment1_url: header "Location"
  fragment1_id: jsonpath "$.fragment.id"

GET {{fragment1_url}}/info
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200
[Asserts]
  jsonpath "$.status" == "ok"
  jsonpath "$.fragment.id" == "{{fragment1_id}}"
  jsonpath "$.fragment.type" == "application/json"
  jsonpath "$.fragment.size" == 25
  jsonpath "$.fragment.ownerId" isString
  jsonpath "$.fragment.created" isString
  jsonpath "$.fragment.updated" isString

POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=
Content-Type: text/markdown

`DynamoDB is **great**.`

HTTP/1.1 201
[Captures]
  fragment2_url: header "Location"
  fragment2_id: jsonpath "$.fragment.id"

GET {{fragment2_url}}/info
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200
[Asserts]
  jsonpath "$.status" == "ok"
  jsonpath "$.fragment.id" == "{{fragment2_id}}"
  jsonpath "$.fragment.type" == "text/markdown"
  jsonpath "$.fragment.size" == 22
  jsonpath "$.fragment.ownerId" isString
  jsonpath "$.fragment.created" isString
  jsonpath "$.fragment.updated" isString

GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200
[Asserts]
  body contains "{{fragment1_id}}"
  body contains "{{fragment2_id}}"

DELETE {{fragment1_url}}
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200

GET {{fragment1_url}}
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 404

GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200
[Asserts]
  body not contains "{{fragment1_id}}"
  body contains "{{fragment2_id}}"
