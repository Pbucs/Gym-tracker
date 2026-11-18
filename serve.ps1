# ========================================================
# IronTrack - Servidor Local para iPhone / Wi-Fi
# Ejecuta este script para probar la PWA en tu PC o iPhone
# ========================================================

$Port = 8080
$Root = $PSScriptRoot

# Detect Local IP on Wi-Fi or LAN
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notmatch 'Loopback|vEthernet|Virtual' -and $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.'
} | Select-Object -ExpandProperty IPAddress -First 1)

if (-not $LocalIP) {
    $LocalIP = "localhost"
}

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add("http://*:$Port/")

try {
    $Listener.Start()
} catch {
    Write-Host "Iniciando en localhost..." -ForegroundColor Yellow
    $Listener = New-Object System.Net.HttpListener
    $Listener.Prefixes.Clear()
    $Listener.Prefixes.Add("http://localhost:$Port/")
    $Listener.Start()
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   🏋️‍♂️ IronTrack PWA Servidor Activo" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " En tu PC:     http://localhost:$Port/" -ForegroundColor White
if ($LocalIP -ne "localhost") {
    Write-Host " En tu iPhone: http://$LocalIP:$Port/" -ForegroundColor Yellow
    Write-Host " (Asegúrate de que el iPhone y tu PC estén en la misma red Wi-Fi)" -ForegroundColor Gray
}
Write-Host "`nPara instalar en tu iPhone:" -ForegroundColor White
Write-Host " 1. Abre el enlace en Safari." -ForegroundColor Gray
Write-Host " 2. Toca el botón 'Compartir' (icono de cuadrado con flecha hacia arriba)." -ForegroundColor Gray
Write-Host " 3. Elige 'Añadir a pantalla de inicio'." -ForegroundColor Gray
Write-Host "`nPresiona CTRL+C en esta consola para detener el servidor.`n" -ForegroundColor DarkGray

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

while ($Listener.IsListening) {
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $UrlPath = $Request.Url.LocalPath
        if ($UrlPath -eq "/" -or $UrlPath -eq "") {
            $UrlPath = "/index.html"
        }

        # Security check & normalize
        $FilePath = Join-Path $Root ($UrlPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar))

        if (Test-Path $FilePath -PathType Leaf) {
            $Ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
            $ContentType = $MimeTypes[$Ext]
            if (-not $ContentType) { $ContentType = "application/octet-stream" }

            $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
            $Response.ContentType = $ContentType
            $Response.ContentLength64 = $Bytes.Length
            $Response.StatusCode = 200
            $Response.AddHeader("Cache-Control", "no-cache")
            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        } else {
            $Response.StatusCode = 404
            $ErrMsg = [System.Text.Encoding]::UTF8.GetBytes("404 - Archivo no encontrado")
            $Response.OutputStream.Write($ErrMsg, 0, $ErrMsg.Length)
        }

        $Response.Close()
    } catch {
        # Listener stopped or client aborted
    }
}
