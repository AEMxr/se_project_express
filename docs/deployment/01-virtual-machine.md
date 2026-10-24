TripleTen's Project 15 requires me to create a virtual machine (VM) through google cloud and show proficiency in establishing safe methods to deploy websites available to the general internet.  
Unfortunately, google cloud and other services like Azure require a credit or debit card, of which I do not have.  
Instead I have opted to show my proficiency by showing how to create your own isolated virtual machine server on your local computer and establishing safety features to minimize your local environment to exposure and security risks.  
The intention is to be as comprehensive as possible without being wordy.  For further security reasons, I will be deploying the actual project through render, which is a free cloud deployment option.  
I believe security is of upmost importance, which is why I'm ultimately choosing to use a 3rd party cloud provider rather than directly deploying my local machine to the world.

Throughout this endeavor, I will be using the following tools:
- PowerShell 7.6.7
- Bash
- JavaScript
- Oracle VirtualBox version 7.2.22
- Ubuntu 24.10 OS
- ubuntu-24.04.5-live-server-amd64.iso
-

For any questions or confusion, feel free to email me @ asmalcuit@outlook.com

without further ado, here are the steps from beginning to end of how I established my own server to deploy a website to the internet:

## Configuration Inspection:
First I would check your system stats to pregame what your computer can handle when setting up your virtual machine.  Knowing what hardware you're using is important to know what your computer can safely run without complications.

```PowerShell
PowerShell 7.6.7
PS C:\Windows\System32> Get-ComputerInfo |
>>   Select-Object WindowsProductName, WindowsVersion, OsBuildNumber

WindowsProductName WindowsVersion OsBuildNumber
------------------ -------------- -------------
Windows 10 Home    2009           26200

PS C:\Windows\System32> Get-CimInstance Win32_Processor |
>>   Select-Object Name, VirtualizationFirmwareEnabled

Name                                            VirtualizationFirmwareEnabled
----                                            -----------------------------
AMD Ryzen 9 9900X 12-Core Processor                                      True

PS C:\Windows\System32>
PS C:\Windows\System32> Get-MpComputerStatus |
>>   Select-Object AntivirusEnabled, RealTimeProtectionEnabled

AntivirusEnabled RealTimeProtectionEnabled
---------------- -------------------------
            True                      True

PS C:\Windows\System32> Get-CimInstance Win32_OperatingSystem |
>>   Select-Object Caption, Version, BuildNumber

Caption                   Version    BuildNumber
-------                   -------    -----------
Microsoft Windows 11 Home 10.0.26200 26200
```
As you can see, I am using a Ryzen 9 9900x processor, which should be more than enough processing power to run a local VM.  
I had to double check my operating system, which is important in some cases to make sure your OS is properly up to date with whatever version of a program you plan to use.
``` PowerShell
PS C:\Windows\System32> Get-ComputerInfo | ...
```
This command gave me the wrong information saying I was running windows 10 on osbuild 26200. 26200 belongs to windows 11.
citation: 
https://support.microsoft.com/en-us/servicing/os/windows-11/2026/09/kb5124008-windows-11-24h2-25h2-security-update
https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information

Sometimes you will come across discrepencies like this, so using a more comprehensive command may be necessary to double check the data, which is why I ran the command differently:
```PowerShell
PS C:\Windows\System32> Get-CimInstance Win32_OperatingSystem |
>>   Select-Object Caption, Version, BuildNumber
```

## Environment Planning
Now that I know I'm running Windows 11 Home edition with a Ryzen 9 processor, I can better determine which software I want to use.  
There are two main options I would consider depending on my operating system: Oracle VirtualBox & Hyper-V.  If I had Windows 11 Pro, Enterprise, or Education, I would likely use Hyper-V.  
Hyper-V would be the preferred "hypervisor" (a layer that creates and runs virtual machines) over VirtualBox because it is a type 1, bare-metal hypervisor which allows for better performance.  
VirtualBox is a type 2, hosted hypervisor - less performance.  Other type 2 hypervisors you may consider would be VMware Workstation and Parallels Desktop.  
Since I have windows home edition, I will be using the type 2 VirtualBox.  
I'm using VirtualBox over other services simply because it seems to be most recommended for being cross-platform, open source, versatile, and has a strong developer ecosystem.
Okay, so now that I've decided to use VirtualBox, we download it @ https://www.virtualbox.org/wiki/Downloads.
I'm using version 7.2.22, the latest stable version as of october 2026.
When the software is done downloading, you'll want to open it up with intention.  
The way I see it, if you're trying to expose your hardware to the internet, you want to have security in mind.
I'll keep this part of the explanation somewhat brief, but as you go through the installation wizard, you'll want to opt in for a custom setup ->

# Your installation settings should be:
- VirtualBox Application — Enabled
- USB Support — Disabled
- Bridged Networking — Disabled
- Host-Only Networking — Disabled
- Python Support — Disabled

We'll initially use NAT networking, which still allows Ubuntu to access the internet for updates and software installations without exposing incoming ports.
Keep in mind that NAT isn't complete isolation from your windows host or home network.
VirtualBox NAT prevents unsolicited inbound connections by default, but doesn't completely isolate the guest from your computer or local network.  
We'll configure and test those restrictions separately.
We'll also keep windows defender, memory integrity, and other existing windows security protections enabled.
If virtualbox reports and incompatibility, we'll investigate rather than disable security features.

citation:
https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/Security.html

Now that we have virtualbox installed, then next step is to download an ubuntu server.

This project uses MongoDB for the database server and Mongoose is the Node.js library I use to communicate with it.
We can verify this simply by looking at the package json files.

With that said, a quick way to check which version of Mongoose is being used, you can use the bash command:
```bash
$ npm list mongoose
se_project_express-main@1.0.0 C:...
└── mongoose@8.24.5

npm notice
npm notice New major version of npm available! 11.13.0 -> 12.2.1
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.1
npm notice To update run: npm install -g npm@12.2.1
npm notice
```

This is a bit of a mismatch to what my json package files expresses, which is fine for now, this can easily be updated and corrected.

For our purposes, we will be using version 24.04.5 LTS @ https://releases.ubuntu.com/24.04/
You don't need ubuntu desktop.  
We want the server edition because we're learning Linux administration, networking, and deployment without unnecessary desktop software.
We're using version 24.04.5 LTS because for this specific application, we need MongoDB compatibility.
As of october 2026, there are 3 main versions available:

Version	Standard | support ends | My assessment
------------------------------------------------
24.04.5 LTS | 2029 | Best fit for our current setup
26.04.1 LTS | 2031 | Excellent newer alternative
26.10 | July 2027 | Not ideal for this server

24.04.5 has been around longer with stronger support.  Over time you may want to consider updating to 26.04.1 LTS.

MongoDB 8.0 officially supports Ubuntu 24.04.
This is particularly relevant because TripleTen requires MongoDB on the server.

MongoDB's current compatibility matrix shows:
- Ubuntu 24.04 supports MongoDB 8.x and 9.x.
- Ubuntu 26.04 supports MongoDB 9.0.4 or newer, but not MongoDB 8.x.

Citations:
https://github.com/ubuntu/ubuntu-project-docs/blob/main/docs/release-team/list-of-releases.md
https://ubuntu.com/about/release-cycle?product=ubuntu&release=ubuntu&version=26.04
https://documentation.ubuntu.com/release-notes/26.10/?trk=article-ssr-frontend-pulse_little-text-block
https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-ubuntu
https://www.mongodb.com/docs/community-platform-support

So, I have selected to use Ubuntu Server 24.04 LTS for its long-term security support, compatibility with MongoDB 8.0, and established ecosystem of server administration tools.  
This provides a stable environment for learning and reproducing Node.js, PM2, Nginx, and MongoDB deployment procedures.

We will delve into why this is important for the other software services as we progress into the setup.

So here is where we do our first security checkpoint:
Before proceeding to application deployment, we want to verify:
- Windows is supported and fully updated.
- No public VM ports are open.
- Host-to-guest sharing is disabled.
- Network isolation is configured and tested.
- We have a clean VM restore point or backup.

We'll go through this verification check together.

After you've downloaded the ubuntu server, you'll want to verify the ISO file by comparing the SHA256 checksums.
The values must match exactly.  This check file integrety; verifying the signed checksum file provides stronger authenticity assurance.

To do this, go to https://releases.ubuntu.com/24.04/SHA256SUMS.  You'll see a list of SHA256 checksums.

run this command in powershell:
```powershell
Get-FileHash "$HOME\Downloads\ubuntu-24.04.5-live-server-amd64.iso" -Algorithm SHA256
```
Then compare the results to the listed releases.  If that passes, we're good.

