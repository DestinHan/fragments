# Lab 10 - DynamoDB integration test

# 1. JSON fragment POST
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
`{ "service": "DynamoDB" }`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.ownerId" matches "^[0-9a-fA-F]+$"
jsonpath "$.fragment.id" matches "^[0-9a-fA-F-]+$"
[Captures]
fragment1_url: header "Location"
fragment1_id: jsonpath "$.fragment.id"


# 3. 첫 번째 fragment의 info 가져오기
GET {{fragment1_url}}/info
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment1_id}}"
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" >= 1


# 4. 두 번째 Markdown fragment POST
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
user1@email.com:password1
`DynamoDB is **great**.`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/markdown"
[Captures]
fragment2_url: header "Location"
fragment2_id: jsonpath "$.fragment.id"


# 6. 두 번째 fragment의 info 가져오기
GET {{fragment2_url}}/info
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment2_id}}"
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" >= 1


# 7. 같은 유저의 fragment 목록 (id만) 조회
GET http://localhost:8080/v1/fragments
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragments" contains "{{fragment1_id}}"
jsonpath "$.fragments" contains "{{fragment2_id}}"


# 8. 첫 번째 fragment 삭제
DELETE {{fragment1_url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200


# 10. 첫 번째 fragment 데이터를 다시 GET -> 404여야 함
GET {{fragment1_url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 404


# 12. 목록 다시 조회: 첫 번째 id는 없어야 하고 두 번째 id는 남아 있어야 함
GET http://localhost:8080/v1/fragments
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.fragments" not contains "{{fragment1_id}}"
jsonpath "$.fragments" contains "{{fragment2_id}}"
