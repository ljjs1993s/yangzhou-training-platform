# 扬州培训平台 - 公网隧道守护脚本
# 功能：自动启动服务 + SSH隧道 + 断线重连 + 显示公网地址

param(
    [int]$Port = 3001,
    [int]$RetryDelay = 10
)

$ErrorActionPreference = "Continue"
$script:NodeProcess = $null
$script:TunnelProcess = $null
$script:PublicUrl = ""

# ─── 1. 查找 Node.js ───
function Find-NodeExe {
    $paths = @(
        "$env:USERPROFILE\.trae-cn\binaries\node\versions\24.15.0\node.exe",
        "$env:USERPROFILE\.workbuddy\binaries\node\versions\*\node.exe",
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
    )
    foreach ($p in $paths) {
        $found = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    # fallback: PATH
    $which = Get-Command node -ErrorAction SilentlyContinue
    if ($which) { return $which.Source }
    return $null
}

# ─── 2. 启动 Node.js 服务 ───
function Start-TrainingServer {
    $nodeExe = Find-NodeExe
    if (-not $nodeExe) {
        Write-Host "[ERROR] 未找到 Node.js，请安装后重试" -ForegroundColor Red
        exit 1
    }
    Write-Host "[INFO] Node.js: $nodeExe" -ForegroundColor Cyan
    $ver = & $nodeExe --version 2>&1
    Write-Host "[INFO] 版本: $ver" -ForegroundColor Cyan

    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $procInfo = New-Object System.Diagnostics.ProcessStartInfo
    $procInfo.FileName = $nodeExe
    $procInfo.Arguments = "server.js"
    $procInfo.WorkingDirectory = $scriptDir
    $procInfo.UseShellExecute = $false
    $procInfo.RedirectStandardOutput = $true
    $procInfo.RedirectStandardError = $true

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $procInfo
    $proc.Start() | Out-Null

    # 读取输出确认启动
    $timeout = 20
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $started = $false
    while ($sw.Elapsed.TotalSeconds -lt $timeout) {
        $line = $proc.StandardOutput.ReadLine()
        if ($line) {
            if ($line -match "listening|started|已启动|运行") { $started = $true }
        }
        if ($started) { break }
        Start-Sleep -Milliseconds 500
    }
    $sw.Stop()
    
    if ($started) {
        Write-Host "[INFO] Server.js 启动成功" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Server.js 已启动（等待端口就绪）" -ForegroundColor Yellow
    }
    $script:NodeProcess = $proc
}

# ─── 3. 启动 SSH 隧道 ───
function Start-SshTunnel {
    $procInfo = New-Object System.Diagnostics.ProcessStartInfo
    $procInfo.FileName = "ssh"
    $procInfo.Arguments = "-o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -R 80:localhost:$Port nokey@localhost.run"
    $procInfo.UseShellExecute = $false
    $procInfo.RedirectStandardOutput = $true
    $procInfo.RedirectStandardError = $true

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $procInfo

    $eventJob = Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -Action {
        $line = $Event.SourceEventArgs.Data
        if ($line) {
            Write-Host $line
            # 提取 URL
            if ($line -match "(https?://[a-z0-9]+\.lhr\.life)") {
                $script:PublicUrl = $matches[1]
                Write-Host ""
                Write-Host "========================================" -ForegroundColor Green
                Write-Host "  公网地址: $script:PublicUrl" -ForegroundColor Yellow
                Write-Host "========================================" -ForegroundColor Green
                Write-Host ""
            }
        }
    }

    $proc.Start() | Out-Null
    $proc.BeginOutputReadLine()
    $proc.BeginErrorReadLine()
    $script:TunnelProcess = $proc
}

# ─── 4. 清理函数 ───
function Stop-All {
    Write-Host "`n[INFO] 正在停止服务..." -ForegroundColor Yellow
    if ($script:TunnelProcess -and !$script:TunnelProcess.HasExited) {
        $script:TunnelProcess.Kill()
    }
    if ($script:NodeProcess -and !$script:NodeProcess.HasExited) {
        $script:NodeProcess.Kill()
    }
    Write-Host "[INFO] 已停止" -ForegroundColor Green
}

# ─── 5. 主循环 ───
Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   扬州培训平台 - 公网隧道守护脚本  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 注册 Ctrl+C 处理
[Console]::TreatControlCAsInput = $false
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-All }

# 启动服务
Start-TrainingServer
Start-Sleep -Seconds 2

# 循环维护隧道
$retryCount = 0
while ($true) {
    # 检查服务是否存活
    if ($script:NodeProcess.HasExited) {
        Write-Host "[WARN] Node.js 服务已退出，重启中..." -ForegroundColor Red
        Start-TrainingServer
    }

    # 检查隧道是否存活
    if (-not $script:TunnelProcess -or $script:TunnelProcess.HasExited) {
        if ($retryCount -gt 0) {
            Write-Host "[WARN] 隧道已断开，第 $retryCount 次重连..." -ForegroundColor Yellow
        }
        $retryCount++
        Start-SshTunnel
    }

    Start-Sleep -Seconds 5
}
