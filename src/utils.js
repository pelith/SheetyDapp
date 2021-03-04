function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSheetValueByRange(sheetName, range) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const value = sheet.getRange(range).getValue();
  return value;
}

function setSheetValueByRange(sheetName, range, value) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  sheet.getRange(range).setValue(value);
}

function getEtherscanLink(chainId, data, type) {
  const ETHERSCAN_PREFIXES = {
    1: '',
    3: 'ropsten.',
    4: 'rinkeby.',
    5: 'goerli.',
    42: 'kovan.',
  };
  const prefix = `https://${
    ETHERSCAN_PREFIXES[chainId] || ETHERSCAN_PREFIXES[1]
  }etherscan.io`;
  switch (type) {
  case 'transaction': {
    return `${prefix}/tx/${data}`;
  }
  case 'address':
  default: {
    return `${prefix}/address/${data}`;
  }
  }
}

function format(formatStr /* , args */) {
  const args = Array.prototype.slice.call(
    arguments,
    1,
  );
  return formatStr.replace(
    /{(\d+)}/g,
    (match, number) => (typeof args[number] !== 'undefined' ? args[number] : match),
  );
}

function json(/* args */) {
  const temp = {};
  for (let i = 0; i < arguments.length / 2; i++) {
    temp[arguments[i * 2]] = arguments[i * 2 + 1];
  }
  return JSON.stringify(temp);
}

function _uuid() {
  let d = Date.now();
  if (
    typeof performance !== 'undefined'
    && typeof performance.now === 'function'
  ) {
    d += performance.now(); // use high-precision timer if available
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (c) => {
      const r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    },
  );
}

function get(name) {
  return SpreadsheetApp.getActive().getRangeByName(name).getValue().toString();
}

function set(name, value) {
  return SpreadsheetApp.getActive().getRangeByName(name).setValue(value);
}

function isAddress(value) {
  try {
    return getAddress(value);
  } catch (e) {
    return false;
  }
}

function shortenAddress(address, chars = 4) {
  // const parsed = isAddress(address);
  // if (!parsed) {
  //   throw Error(`Invalid 'address' parameter '${address}'.`);
  // }
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
}
