//AES key is only for example, generate unique key!!
const aesKey = '46d3b0827bc971e017c723ca34ea106f28bd607b3b16b7ddf6045e21f7e2b2d6';
const CHECKSUM_SIZE = 4;

const COMPONENT_ENUM = {
  'dw': 'Door/window sensor',
  'rt': 'Rotation sensor',
  'lx': 'Lux sensor'
};

const DW_ENUM = { '0': 'close event', '1': 'open event' };

// ---------- MQTT helper ----------
function pushToMQ(topic, payload) {
  if (!MQTT.isConnected()) {
    console.log('MQTT non connesso, impossibile pubblicare su', topic);
    return false;
  }

  MQTT.publish(topic, payload);
  console.log('MQTT pubblicato su', topic, 'payload:', payload);
  return true;
}

// ---------- Checksum ----------
function generateChecksum(msg) {
  let checksum = 0;
  for (let i = 0; i < msg.length; i++) {
    checksum ^= msg.charCodeAt(i);
  }
  let hexChecksum = checksum.toString(16);

  while (hexChecksum.length < CHECKSUM_SIZE) {
    hexChecksum = '0' + hexChecksum;
  }

  return hexChecksum.slice(-CHECKSUM_SIZE);
}

function verifyMessage(message) {
  if (message.length < CHECKSUM_SIZE + 1) {
    console.log('[LoRa] invalid message (too short)');
    return;
  }

  const receivedCheckSum = message.slice(0, CHECKSUM_SIZE);
  const _message = message.slice(CHECKSUM_SIZE);
  const expectedChecksum = generateChecksum(_message);

  if (receivedCheckSum !== expectedChecksum) {
    console.log('[LoRa] invalid message (checksum corrupted)');
    return;
  }

  return _message;
}

// ---------- Decrypt ----------
function decryptMessage(buffer, keyHex) {
  function fromHex(hex) {
    const arr = new ArrayBuffer(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      arr[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return arr;
  }

  function hex2a(hex) {
    hex = hex.toString();
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  }

  function toHex(buffer) {
    let s = '';
    for (let i = 0; i < buffer.length; i++) {
      s += (256 + buffer[i]).toString(16).substr(-2);
    }
    return s;
  }

  const key = fromHex(keyHex);
  const decrypted = AES.decrypt(buffer, key, { mode: 'ECB' });

  if (!decrypted || decrypted.byteLength === 0) {
    console.log('[LoRa] invalid msg (empty decryption result)');
    return;
  }

  const hex = toHex(decrypted);
  const checksumMessage = hex2a(hex).trim();
  const finalMessage = verifyMessage(checksumMessage);
  
  return finalMessage;
}

// ---------- Message handler ----------
function messageHandler(message) {
  if (message.slice(0, 4) !== 'snr-') {
    console.log('Message prefix error!');
    return;
  }

  const _message = message.slice(4);            // es: "dw202:0", "rt203:45.6", "lx201:12.3"
  const parts = _message.split(':');
  const value = parts[1];
  const component = parts[0];                   // es: "dw202"
  const name = component.slice(0, 2);           // "dw", "rt", "lx"
  const id = component.slice(2);                // "202", "203", ...

  const namePrettified = COMPONENT_ENUM[name] || 'Unknown component';

  // topic MQTT generico: lora/<name>/<id>
  const topic = 'lora/' + name + '/' + id;

  if (name === 'dw') {
    const text = [namePrettified, id, 'registered door', DW_ENUM[value]].join(' ');
    console.log(text);

    const payload = JSON.stringify({
      type: 'door',
      id: id,
      value: value,
      event: DW_ENUM[value] || 'unknown',
      raw: message
    });

    pushToMQ(topic, payload);
    return;
  }

  if (name === 'rt') {
    const text = [namePrettified, id, 'registered', value, '°', 'rotation change'].join(' ');
    console.log(text);

    const payload = JSON.stringify({
      type: 'rotation',
      id: id,
      value: parseFloat(value),
      unit: 'deg',
      raw: message
    });

    pushToMQ(topic, payload);
    return;
  }

  if (name === 'lx') {
    const text = [namePrettified, id, 'registered', value, 'lux change'].join(' ');
    console.log(text);

    const payload = JSON.stringify({
      type: 'lux',
      id: id,
      value: parseFloat(value),
      unit: 'lux',
      raw: message
    });

    pushToMQ(topic, payload);
    return;
  }

  // caso non previsto
  console.log('Tipo componente non gestito:', name, 'id:', id, 'value:', value);
}

// ---------- LoRa event handler ----------
Shelly.addEventHandler(function (event) {
  if (
    typeof event !== 'object' ||
    event.name !== 'lora' ||
    !event.info ||
    !event.info.data
  ) {
    return;
  }

  const encryptedMsg = atob(event.info.data);
  const decryptedMessage = decryptMessage(encryptedMsg, aesKey);

  //do nothing, message is not encrypted or AES key mismatch
  if (typeof decryptedMessage === "undefined") {
    return;
  }

  messageHandler(decryptedMessage);
});
