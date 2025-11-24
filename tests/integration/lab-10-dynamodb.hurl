# Lab 10 - DynamoDB integration tests

# 1. 첫 번째 JSON fragment 생성
POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=
Content-Type: application/json

{ "service": "DynamoDB" }

HTTP/1.1 201
[Captures]
fragment1_url: header "Location"
fragment1_id: jsonpath "$.fragment.id"

# 3. 첫 번째 fragment의 metadata (/info) 조회
GET {{fragment1_url}}/info
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment1_id}}"
jsonpath "$.fragment.type" == "application/json"
# { "service": "DynamoDB" } 의 길이 = 25 바이트
jsonpath "$.fragment.size" == 25
jsonpath "$.fragment.ownerId" isString
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString

# 4. 두 번째 Markdown fragment 생성
POST http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=
Content-Type: text/markdown

`DynamoDB is **great**.`

HTTP/1.1 201
[Captures]
fragment2_url: header "Location"
fragment2_id: jsonpath "$.fragment.id"

# 6. 두 번째 fragment의 metadata (/info) 조회
GET {{fragment2_url}}/info
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment2_id}}"
jsonpath "$.fragment.type" == "text/markdown"
# "DynamoDB is **great**." 길이 = 22 바이트
jsonpath "$.fragment.size" == 22
jsonpath "$.fragment.ownerId" isString
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString

# 7. 해당 사용자 모든 fragment ID 목록 조회 (expand=false)
GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200
[Asserts]
# 목록 JSON 안에 fragment1_id, fragment2_id 문자열이 포함되어 있는지만 확인
body contains "{{fragment1_id}}"
body contains "{{fragment2_id}}"

# 8. 첫 번째 fragment 삭제
DELETE {{fragment1_url}}
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200

# 10. 첫 번째 fragment 다시 GET 시도 → 404 기대
GET {{fragment1_url}}
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 404

# 12. 다시 fragment ID 목록 조회
# 첫 번째 ID는 없어야 하고 두 번째 ID는 남아 있어야 함
GET http://localhost:8080/v1/fragments
Authorization: Basic dXNlcjE6cGFzc3dvcmQ=

HTTP/1.1 200
[Asserts]
body not contains "{{fragment1_id}}"
body contains "{{fragment2_id}}"
