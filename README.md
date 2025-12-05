# Receive Send **Shelly Blu Door/Window**  sensor States via Lora and publish on Homeassistant mqtt

## Short Description

This setup allows
one Shelly device to receive via LoRa and publish to home assistenat mqtt
one Shelly device to send messages via Lora when a BTHome door window sensor's state changes.

## Requirements
-2x Shelly 1 Gen3  updated to firmware 1.71 or greater
-2x Shelly Lora Add-on updated to firmware 2.1.1 ore greater
-1 x Shelly BTHome Blu Door Window sensor
- A **unique AES key** is required for encrypting messages  
  - The provided key is just an example  
  - You can generate your own [here](https://generate-random.org/encryption-key-generator)

## Installation

1. Wire up your Shelly devices 
2. Power on the device
3. Configure wifi and update firmware
4. Power off the device
5. Attach the LoRa add-ons to the Shelly device
6. Power on the device  and update firmware
7. In the embedded web interface, open the **Add-on** submenu and enable the **LoRa add-on**
8. Check the Lora setting to fit your country

---

### To Receive sensor states (this device must be at home, connected to wifi and home assistant)

1. Configure Mqtt settings with server ip, username, password etc
2. Create a script named `lora-covercontrol-listener_custom_mqtt.js`
3. Change the AES key  
4. Start the script
5. See the console log
6. Enable to run on start up when you are happy

---

### To Send Sensor States (this is remote device like in a garage that is near to the Bt device)

1. Go to Componets and Pair the sensor to Bluetooth (BTHome) devices
2. See how the sensor component (lux, rotation, door/window) get identified (e.g., `bthomesensor:201`) 
3. Create a script named `lora-covercontrol-bthome-emitter.js`
4. Define in the script the components the script should listen to (e.g., `bthomesensor:201`)
5. Set thresholds in the script for lux or rotation that generate the event
6. Start the script
7. See the console log
8. Enable to run on start up when you are happy


this script  has been derived by https://github.com/ALLTERCO/shelly-script-examples/blob/main/lora-covercontrol-receiver/README.md
