# Lab 10 – DynamoDB metadata test

# 1. First JSON fragment
POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=
Content-Type: application/json

{ "service": "DynamoDB" }

HTTP/1.1 201
[Captures]
  fragment1_url: header "Location"
  fragment1_id: jsonpath "$.fragment.id"

# 2. First /info
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

# 3. Second Markdown fragment
POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=
Content-Type: text/markdown

`DynamoDB is **great**.`

HTTP/1.1 201
[Captures]
  fragment2_url: header "Location"
  fragment2_id: jsonpath "$.fragment.id"

# 4. Second /info
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

# 5. List fragments
GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200
[Asserts]
  body contains "{{fragment1_id}}"
  body contains "{{fragment2_id}}"

# 6. Delete first fragment
DELETE {{fragment1_url}}
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200

# 7. First fragment should now 404
GET {{fragment1_url}}
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 404

# 8. List again — first gone, second still present
GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200
[Asserts]
  body not contains "{{fragment1_id}}"
  body contains "{{fragment2_id}}"
