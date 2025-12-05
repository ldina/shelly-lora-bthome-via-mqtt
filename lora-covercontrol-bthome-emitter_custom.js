//AES key is only for example, generate unique key!!
const aesKey = '46d3b0827bc971e017c723ca34ea106f28bd607b3b16b7ddf6045e21f7e2b2d6';
const CHECKSUM_SIZE = 4;

const MSG_PREFIX = 'snr-';
const DOOR_COMPONENT = 'bthomesensor:202'; //window sensor to listen for
const LUX_COMPONENT = 'bthomesensor:201'; //lux sensor to listen for
const ROTATION_COMPONENT = 'bthomesensor:203'; //rotation sensor to listen for
const ROTATION_LIMIT = 45; //rotation threshold
const LUX_LIMIT = 5; //lux threshold
const ROTATION_STEP = 0;
const LUX_STEP = 0;

let _lux = null;
let _rotation = null;

function encryptMessage(msg, keyHex) {
  function fromHex(hex) {
    const arr = new ArrayBuffer(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      arr[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return arr;
  }

  function padRight(msg, blockSize) {
    const paddingSize = (blockSize - msg.length % blockSize) % blockSize;;

    for (let i = 0; i < paddingSize; i++) {
      msg += ' ';
    }

    return msg;
  }

  msg = msg.trim();
  const formattedMsg = padRight(msg, 16);
  const key = fromHex(keyHex);
  const encMsg = AES.encrypt(formattedMsg, key, { mode: 'ECB' });
  return encMsg;
}

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

function sendMessage(message) {
  const checkSumMessage = generateChecksum(message) + message;
  const encryptedMessage = encryptMessage(checkSumMessage, aesKey);

  Shelly.call(
    'Lora.SendBytes',
    { id: 100, data: btoa(encryptedMessage) },
    function (_, err_code, err_msg) {
      if (err_code !== 0) {
        console.log('Error:', err_code, err_msg);
      }
    }
  );
}

function stepVerify(previous, current, limit, step) {
  //first value exceeding limit
  if (previous === null && current > limit) {
    return true;
  }

  //value exceed limit and is bigger/lesser than step variable
  return current >= limit && (current <= (previous - step) || current >= (previous + step));
}

function statusHandler(status) {
  const component = status.component;
  const value = status.delta.value;
  const id = status.id;
  
  console.log("COMPONENT:", component, "VALUE:", value, "ID:", id);

  
  if (component === DOOR_COMPONENT) {
    sendMessage(MSG_PREFIX + 'dw' + id + ':' + (value ^ 0));
    return;
  };

  if (component === ROTATION_COMPONENT && stepVerify(_rotation, value, ROTATION_LIMIT, ROTATION_STEP)) {
    console.log("ROTATION supera limite, invio messaggio");
    sendMessage(MSG_PREFIX + 'rt' + id + ':' + value);
    _rotation = value;
    return;
  }

  if (component === LUX_COMPONENT && stepVerify(_lux, value, LUX_LIMIT, LUX_STEP)) {
    console.log("LUX supera limite, invio messaggio");
    sendMessage(MSG_PREFIX + 'lx' + id + ':' + value);
    _lux = value;
    return;
  }
}

Shelly.addStatusHandler(
  function(status) {
    if (
      status.component === DOOR_COMPONENT ||
      status.component === LUX_COMPONENT ||
      status.component === ROTATION_COMPONENT
    ) {
      statusHandler(status);
    }
  }
)