_devkit_completions() {
  local cur prev words commands
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  commands="json base64 b64 url jwt hash id time network net files text color b64e b64d config completion --help --version"
  if [[ ${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "${commands}" -- "${cur}") )
    return
  fi
  case "${COMP_WORDS[1]}" in
    json) COMPREPLY=( $(compgen -W "format minify validate query diff" -- "${cur}") ) ;;
    base64|b64|url) COMPREPLY=( $(compgen -W "encode decode" -- "${cur}") ) ;;
    jwt) COMPREPLY=( $(compgen -W "encode decode" -- "${cur}") ) ;;
    hash) COMPREPLY=( $(compgen -W "md5 sha1 sha256 sha512 bcrypt check" -- "${cur}") ) ;;
    id) COMPREPLY=( $(compgen -W "uuid nanoid slug random-string pin" -- "${cur}") ) ;;
    time) COMPREPLY=( $(compgen -W "now timestamp date-diff cron" -- "${cur}") ) ;;
    network|net) COMPREPLY=( $(compgen -W "ip port-check dns http" -- "${cur}") ) ;;
    files) COMPREPLY=( $(compgen -W "file-size file-tree duplicate-files zip unzip" -- "${cur}") ) ;;
    text) COMPREPLY=( $(compgen -W "case count replace" -- "${cur}") ) ;;
    color) COMPREPLY=( $(compgen -W "hex-to-rgb rgb-to-hex palette" -- "${cur}") ) ;;
  esac
}
complete -F _devkit_completions devkit
