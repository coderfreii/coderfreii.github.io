###### 开启子系统功能

~~~powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
~~~



###### 开启虚拟机功能

~~~power	
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
~~~



###### 升级内核

https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi

###### 设置版本

~~~powershell
wsl --set-default-version 2
~~~



###### 设置window的防火墙

~~~powershell
New-NetFirewallRule -DisplayName "WSL" -Direction Inbound  -InterfaceAlias "vEthernet (WSL)"  -Action Allow
~~~

###### 家庭版hyper-v

~~~powershell
pushd "%~dp0"
dir /b %SystemRoot%\servicing\Packages\*Hyper-V*.mum >hyper-v.txt
for /f %%i in ('findstr /i . hyper-v.txt 2^>nul') do dism /online /norestart /add-package:"%SystemRoot%\servicing\Packages\%%i"
del hyper-v.txt
Dism /online /enable-feature /featurename:Microsoft-Hyper-V-All /LimitAccess /ALL
pause
~~~

错误: 14107 一个或多个要求的事务成员不存在。
检查一下 hyper-v.txt  将错误的语言版本删去

###### wsl桥接 

###### 开启

~~~powershell
检查并以管理员身份运行PS并带上参数

$currentWi = [Security.Principal.WindowsIdentity]::GetCurrent()
$currentWp = [Security.Principal.WindowsPrincipal]$currentWi
if( -not $currentWp.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))
{
    $boundPara = ($MyInvocation.BoundParameters.Keys | foreach{'-{0} {1}' -f  $_ ,$MyInvocation.BoundParameters[$_]} ) -join ' '
    $currentFile = $MyInvocation.MyCommand.Definition
    $fullPara = $boundPara + ' ' + $args -join ' '
    Start-Process "$psHome\pwsh.exe"   -ArgumentList "$currentFile $fullPara"   -verb runas
    return
}
#首先随意执行一条wsl指令，确保wsl启动，这样后续步骤才会出现WSL网络
echo "正在检测wsl运行状态..."
wsl --cd ~ -e ls
echo "正在获取网卡信息..."
Get-NetAdapter
echo "`n正在将WSL网络桥接到以太网..."
Set-VMSwitch WSL -NetAdapterName WLAN
echo "`n正在修改WSL网络配置..."
wsl --cd ~ -e sh -c /home/net.sh
echo "`ndone"
pause
~~~



###### 关闭

~~~powershell
检查并以管理员身份运行PS并带上参数

$currentWi = [Security.Principal.WindowsIdentity]::GetCurrent()
$currentWp = [Security.Principal.WindowsPrincipal]$currentWi
if( -not $currentWp.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))
{
    $boundPara = ($MyInvocation.BoundParameters.Keys | foreach{'-{0} {1}' -f  $_ ,$MyInvocation.BoundParameters[$_]} ) -join ' '
    $currentFile = $MyInvocation.MyCommand.Definition
    $fullPara = $boundPara + ' ' + $args -join ' '
    Start-Process "$psHome\pwsh.exe"   -ArgumentList "$currentFile $fullPara"   -verb runas
    return
}
echo "正在解除wsl桥接..."
Set-VMSwitch WSL  -SwitchType Internal
echo "正在重启wsl"
wsl --shutdown
wsl --cd ~ -e ls
echo "`ndone"
pause
~~~

###### net.sh

~~~powershell
#!/bin/bash
new_ip=192.168.101.101
brd=192.168.101.255
gateway=192.168.101.1
nameserver=192.168.101.1
net_dev=eth0
echo "password" | sudo -S ip addr del $(ip addr show $net_dev | grep 'inet\b' | awk '{print $2}' | head -n 1) dev $net_dev
sudo ip addr add $new_ip/24 broadcast $brd dev $net_dev
sudo ip route add 0.0.0.0/0 via $gateway dev $net_dev
sudo sed -i "\$c nameserver $nameserver" /etc/resolv.conf
~~~

随后如果局域网无法访问wsl
可尝试wsl主动ping一下网关


###### 设置golang国内代理
go env -w GOPROXY=https://proxy.golang.com.cn,direct

