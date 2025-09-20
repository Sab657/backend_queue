# QR Queue System - Network Setup Guide

## Problem
Your QR codes were using `localhost` which only works on the same device. To scan QR codes from other devices (like phones), you need to use your local network IP address.

## Solution
I've updated your code to use your local network IP address: **192.168.1.69**

## How to Use

### Option 1: Use the Batch File (Windows)
1. Double-click `set-env.bat`
2. This will set the environment variables for your current session
3. Then run: `npm run dev`

### Option 2: Use the PowerShell Script
1. Right-click `set-env.ps1` and select "Run with PowerShell"
2. This will set the environment variables for your current session
3. Then run: `npm run dev`

### Option 3: Manual Environment Variables
```bash
# In Command Prompt
set HOST=192.168.1.69
set PORT=5000
npm run dev

# In PowerShell
$env:HOST = "192.168.1.69"
$env:PORT = "5000"
npm run dev
```

## What Changed
- **Server now listens on**: `192.168.1.69:5000`
- **QR codes now generate URLs like**: `http://192.168.1.69:5000/api/queues/join/{serviceId}`
- **Local access still works**: `http://localhost:5000`
- **Network access**: `http://192.168.1.69:5000`

## Testing
1. Start your server with the environment variables set
2. Create a new service (this will generate a QR code with the correct URL)
3. Scan the QR code from your phone
4. The phone should now be able to access your queue system

## Important Notes
- Make sure your phone and computer are on the same WiFi network
- Your computer's firewall might need to allow connections on port 5000
- The IP address `192.168.1.69` is specific to your network - don't share this with others

## Troubleshooting
If QR codes still don't work:
1. Check that the environment variables are set: `echo %HOST%` (should show 192.168.1.69)
2. Verify your server is running on the correct IP: check the console output
3. Test network connectivity: try accessing `http://192.168.1.69:5000/api/health` from your phone
