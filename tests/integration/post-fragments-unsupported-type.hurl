POST http://localhost:8080/v1/fragments
Content-Type: application/x-bogus
[BasicAuth]
user1@email.com:password1
`nope`

HTTP/1.1 415
