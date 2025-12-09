# Start/Restart CutListCreator dev server
# Kills stray node processes, loads .env, starts dev server, opens browser, and logs to dev-server.log

# 1) Kill all node processes
try {
  taskkill /IM node.exe /F 2>$null | Out-Null
} catch {}

# 2) Change directory to the project
$projectPath = "C:\Users\hi\workspace\CutListCreator"
Set-Location $projectPath

# 3) Load .env automatically
$envFile = Join-Path $projectPath ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $parts = $_ -split '=', 2
    if ($parts.Count -eq 2) {
      $name = $parts[0].Trim()
      $value = $parts[1].Trim('"').Trim()
      if ($name) {
        try { $env[$name] = $value } catch { Set-Item -Path "env:$name" -Value $value }
      }
    }
  }
}

# 4) Start the dev server with logging to dev-server.log
$logPath = Join-Path $projectPath "dev-server.log"
Start-Process -FilePath "cmd.exe" -ArgumentList '/c',"npm run dev > `"$logPath`" 2>&1" -WorkingDirectory $projectPath

# 5) Wait briefly then open the app in the browser
Start-Sleep -Seconds 3
Start-Process "http://localhost:5000"
