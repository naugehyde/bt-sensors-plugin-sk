# Bluetooth Device Pairing using bluetoothctl

This guide provides a step-by-step procedure for pairing, trusting, and connecting a new Bluetooth device using the bluetoothctl command-line utility, which is the official Bluetooth client for BlueZ (the Linux Bluetooth stack).

## Prerequisites

- A running Linux system (e.g., Debian, Ubuntu, Fedora, Arch).
- The bluez package installed (which includes bluetoothctl).
- The Bluetooth service (bluetooth.service) is running. 
- Your local Bluetooth adapter is enabled and powered on.

## The Pairing Process

Follow these steps within your terminal:

### Step 1: Launch bluetoothctl

Open your terminal and run the command to enter the interactive bluetoothctl prompt.

```

bluetoothctl

```

(The prompt should change to [bluetooth]#)

### Step 2: Check Controller Status (Optional but recommended)Ensure your adapter is powered on and set to discoverable/pairable mode.

```

[bluetooth]# show

```

If the Powered field is listed as no, power the adapter on:

```

[bluetooth]# power on

```

### Step 3: Start Scanning for Devices

Put your target Bluetooth device into pairing mode (see device instructions). Then, start the scanning process:

```

[bluetooth]# scan on

```


You will see a list of discovered devices scrolling by with their MAC addresses and names.

```
Discovery started
[CHG] Device 12:34:56:78:90:AB Name: My Bluetooth Headphones
[NEW] Device AB:CD:EF:12:34:56 Name: Wireless Mouse
...
```


### Step 4: Identify and Stop Scanning

Once you see the name of your device, copy its MAC Address (e.g., AB:CD:EF:12:34:56) and stop the scan to save battery and reduce clutter:

```

[bluetooth]# scan off

```


Step 5: Trust the Device

Trusting the device is crucial. It allows the device to reconnect automatically after a reboot or disconnection without needing to re-pair. Replace [MAC_ADDRESS] with your device's MAC address.

```

[bluetooth]# trust [MAC_ADDRESS]

Attempting to trust AB:CD:EF:12:34:56
[CHG] Device AB:CD:EF:12:34:56 Trusted: yes
...

```

### Step 6: Connect the Device 

This step attempts to establish the active connection. 

```

[bluetooth]# connect [MAC_ADDRESS]

Attempting to connect to AB:CD:EF:12:34:56
[CHG] Device AB:CD:EF:12:34:56 Connected: yes
Connection successful
...
```

### Step 7: Pair the Device

If the connection attempt in Step 6 did not automatically handle the key exchange, or if you prefer to explicitly perform the key exchange first, use the pair command. This initiates the actual pairing sequence. If your device requires a PIN or Passkey, bluetoothctl will prompt you to enter it (or confirm it). NOTE: Check your device's manual for setting the device's pairing mode.

```

[bluetooth]# pair [MAC_ADDRESS]
Attempting to pair with AB:CD:EF:12:34:56
[CHG] Device AB:CD:EF:12:34:56 Paired: yes
Pairing successful
...

```

(If prompted, enter or confirm the Passkey. If this command succeeds, you may need to run connect (Step 6) again to establish the active link.)

### Step 8: Exit

Once the connection is established, you can exit the interactive utility.

```

[bluetooth]# exit

```
