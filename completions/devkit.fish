set -l commands json base64 b64 url jwt hash id time network net files text color b64e b64d config completion
complete -c devkit -f -n '__fish_use_subcommand' -a "$commands"
complete -c devkit -f -n '__fish_seen_subcommand_from json' -a 'format minify validate query diff'
complete -c devkit -f -n '__fish_seen_subcommand_from base64 b64 url jwt' -a 'encode decode'
complete -c devkit -f -n '__fish_seen_subcommand_from hash' -a 'md5 sha1 sha256 sha512 bcrypt check'
complete -c devkit -f -n '__fish_seen_subcommand_from id' -a 'uuid nanoid slug random-string pin'
complete -c devkit -f -n '__fish_seen_subcommand_from time' -a 'now timestamp date-diff cron'
complete -c devkit -f -n '__fish_seen_subcommand_from network net' -a 'ip port-check dns http'
complete -c devkit -f -n '__fish_seen_subcommand_from files' -a 'file-size file-tree duplicate-files zip unzip'
complete -c devkit -f -n '__fish_seen_subcommand_from text' -a 'case count replace'
complete -c devkit -f -n '__fish_seen_subcommand_from color' -a 'hex-to-rgb rgb-to-hex palette'
