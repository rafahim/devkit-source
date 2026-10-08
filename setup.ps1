$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$manifestPath = Join-Path $root 'project-source.json'
$manifest = Get-Content -Raw -Path $manifestPath | ConvertFrom-Json
foreach ($property in $manifest.files.PSObject.Properties) {
    $target = Join-Path $root $property.Name
    $parent = Split-Path -Parent $target
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $bytes = [Convert]::FromBase64String([string]$property.Value)
    [System.IO.File]::WriteAllBytes($target, $bytes)
}
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
node --input-type=module -e "import {createWriteStream} from 'node:fs'; import {resolve} from 'node:path'; const archiver=(await import('archiver')).default; const out=createWriteStream(resolve('devkit-source.zip')); const archive=archiver('zip',{zlib:{level:9}}); await new Promise((ok,fail)=>{out.on('close',ok);out.on('error',fail);archive.on('error',fail);archive.pipe(out);archive.glob('**/*',{dot:true,ignore:['node_modules/**','devkit-source.zip','.git/**']});(()=>{const finalization=archive.finalize();if(finalization&&typeof finalization.catch==='function')finalization.catch(fail)})()}); process.stdout.write('Created devkit-source.zip\n');"
if ($LASTEXITCODE -ne 0) { throw 'ZIP creation failed.' }
