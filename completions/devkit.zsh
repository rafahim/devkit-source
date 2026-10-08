#compdef devkit
_arguments '1:command:(json base64 b64 url jwt hash id time network net files text color b64e b64d config completion)' '*::argument:->args'
case $words[2] in
  json) _arguments '2:action:(format minify validate query diff)' ;;
  base64|b64|url|jwt) _arguments '2:action:(encode decode)' ;;
  hash) _arguments '2:algorithm:(md5 sha1 sha256 sha512 bcrypt check)' ;;
  id) _arguments '2:action:(uuid nanoid slug random-string pin)' ;;
  time) _arguments '2:action:(now timestamp date-diff cron)' ;;
  network|net) _arguments '2:action:(ip port-check dns http)' ;;
  files) _arguments '2:action:(file-size file-tree duplicate-files zip unzip)' ;;
  text) _arguments '2:action:(case count replace)' ;;
  color) _arguments '2:action:(hex-to-rgb rgb-to-hex palette)' ;;
esac
