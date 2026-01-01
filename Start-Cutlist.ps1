# Start CutListCreator (backend + frontend)

# 1) Kill all node.exe processes
try {
  taskkill /IM node.exe /F 2>$null | Out-Null
} catch {}

# 2) Root folder of project
$root = "C:\Users\hi\workspace\CutListCreator"
Set-Location $root

# 3) Load .env (if it exists)
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }  # skip comments/empty
    $parts = $_ -split '=', 2
    if ($parts.Count -eq 2) {
      $name  = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"').Trim("'")
      if ($name) {
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
      }
    }
  }
}

# 4) Start BACKEND from root (port 5000)
Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev:server"

# 5) Start FRONTEND from client folder with --force flag (Vite, port 5173)
$clientDir = Join-Path $root "client"
Start-Process -FilePath "powershell.exe" `
  -ArgumentList "-NoExit", "-Command", "cd '$clientDir'; npm run dev -- --force"

# 6) Wait a bit, then open browser
Start-Sleep -Seconds 8
Start-Process "http://localhost:5173"
