# configure.ps1 - MoonPeak RustDesk 配置脚本（轻量版，不下载安装包）
param(
    [switch]$Silent = $false
)

# 强制 TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

# 配置信息
$ServerHost = "www.moonpeak.cn"
$IdServer = "www.moonpeak.cn:21116"
$RelayServer = "www.moonpeak.cn:21117"
$PublicKey = "wqselgGrSikeex3pCUtvsKVIr9F2dvPmoq44TZQN2Jw="  # 替换为你的实际 Key

# 生成配置字符串（Base64）
$configContent = @"
rendezvous_server = '$IdServer'
nat_type = 1
serial = 0
[options]
key = '$PublicKey'
relay_server = '$RelayServer'
"@
$ConfigBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($configContent))

# 颜色输出函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) { Write-Output $args }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan "🚀 MoonPeak RustDesk 配置工具"
Write-ColorOutput Gray "服务器: $ServerHost"
Write-Output ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-ColorOutput Yellow "⚠️  需要管理员权限，正在请求提升..."
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# 查找 RustDesk 安装路径
$installPaths = @(
    "C:\Program Files\RustDesk",
    "C:\Program Files (x86)\RustDesk",
    "$env:LOCALAPPDATA\RustDesk",
    "$env:ProgramFiles\RustDesk",
    "$env:ProgramFiles(x86)\RustDesk"
)

$rustdeskPath = $null
foreach ($path in $installPaths) {
    if (Test-Path "$path\rustdesk.exe") {
        $rustdeskPath = $path
        break
    }
}

# 如果没找到，提示用户手动选择
if (-not $rustdeskPath) {
    Write-ColorOutput Yellow "⚠️  未检测到 RustDesk 安装"
    Write-Output ""
    Write-Output "请确保："
    Write-Output "1. 已从上方链接下载 rustdesk-1.4.5-x86_64.exe"
    Write-Output "2. 已双击运行安装包完成安装"
    Write-Output "3. 或手动指定安装路径"
    Write-Output ""

    $manualPath = Read-Host "请输入 RustDesk 安装目录（直接回车退出）"
    if ([string]::IsNullOrWhiteSpace($manualPath)) {
        exit 1
    }

    if (Test-Path "$manualPath\rustdesk.exe") {
        $rustdeskPath = $manualPath
    } else {
        Write-ColorOutput Red "❌ 指定路径未找到 rustdesk.exe"
        Read-Host "按 Enter 键退出"
        exit 1
    }
}

Write-ColorOutput Green "✅ 找到 RustDesk: $rustdeskPath"

try {
    # 进入安装目录
    Set-Location $rustdeskPath

    # 应用配置
    Write-ColorOutput Cyan "⚙️  正在配置服务器..."
    .\rustdesk.exe --config $ConfigBase64

    # 安装服务（如果没装）
    Write-ColorOutput Cyan "🔌 检查系统服务..."
    .\rustdesk.exe --install-service
    Start-Sleep -s 2

    # 设置随机密码
    $Password = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object {[char]$_})
    Write-ColorOutput Cyan "🔐 正在设置访问密码..."
    .\rustdesk.exe --password $Password

    # 获取 ID
    Start-Sleep -s 1
    $RustDeskId = .\rustdesk.exe --get-id | Out-String
    $RustDeskId = $RustDeskId.Trim()

    # 输出结果
    Write-Output ""
    Write-ColorOutput Green "═══════════════════════════════════════"
    Write-ColorOutput Green "  🎉 MoonPeak 远程桌面配置成功！"
    Write-ColorOutput Green "═══════════════════════════════════════"
    Write-Output ""
    Write-ColorOutput White "  设备 ID: " -NoNewline; Write-ColorOutput Yellow $RustDeskId
    Write-ColorOutput White "  连接密码: " -NoNewline; Write-ColorOutput Yellow $Password
    Write-ColorOutput White "  服务器: " -NoNewline; Write-ColorOutput Gray $ServerHost
    Write-Output ""
    Write-ColorOutput Gray "  提示：密码已保存到桌面文件"
    Write-ColorOutput Green "═══════════════════════════════════════"

    # 保存到桌面
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    @"
MoonPeak 远程桌面 - 配置信息
生成时间: $(Get-Date)

设备 ID: $RustDeskId
连接密码: $Password
服务器: $ServerHost

使用说明：
1. 在控制端输入 ID: $RustDeskId
2. 输入密码: $Password
3. 即可建立连接
"@ | Out-File -FilePath "$desktopPath\MoonPeak-远程桌面配置.txt" -Encoding UTF8

    if (-not $Silent) {
        Write-Output ""
        Read-Host "按 Enter 键退出"
    }

} catch {
    Write-ColorOutput Red "❌ 配置失败: $_"
    if (-not $Silent) {
        Read-Host "按 Enter 键退出"
    }
    exit 1
}