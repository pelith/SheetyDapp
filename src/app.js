function onOpen() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Promise.all(['initSys', 'reset', 'initApp', 'initConnectButton'].map((functionName) => new Promise((resolve, reject) => {
    try {
      this[functionName].apply(null, null);
      resolve(true);
    } catch (e) {
      reject(e);
    }
  })));
  setConnect();
}

function onSelectionChange(e) {
  // Todo check is a validButton
  const scriptProperties = PropertiesService.getScriptProperties();
  const source = `button.${e.range.getSheet().getSheetName()}!$${
    e.range.rowStart
  }$${e.range.columnStart}`;

  const buttonData = JSON.parse(scriptProperties.getProperty(source));
  console.log(source);
  if (
    buttonData !== null
    && buttonData.data !== undefined
    && buttonData.data.functionIndex !== undefined
    && +buttonData.data.disabledText === 0
  ) {
    const status = get('sys.status');
    const buttonStatus = SpreadsheetApp.getActive().getRangeByName(buttonData.data.statusNameRange);
    if (+status === 0) {
      buttonStatus.setValue(2);
    } else if (+buttonStatus.getValue() === 0 || +buttonStatus.getValue() === 2) {
      buttonStatus.setValue(1);
      emit(
        'write',
        buttonData.data.functionIndex,
        source,
      );
      // TODO functionName
    }
  }
}

function setConnect(isConnected) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const connectButtons = JSON.parse(scriptProperties.getProperty('connectButton'));

  Promise.all(connectButtons.map((connectButton) => new Promise((resolve, reject) => {
    try {
      const sheet = SpreadsheetApp.getActive().getSheetByName(connectButton.sheetName);

      const image = SpreadsheetApp
        .getActive()
        .getSheetByName(connectButton.sheetName)
        .getImages()[connectButton.index];

      image.setAnchorCellXOffset(-5);
      image.setAnchorCellYOffset(-5);
      image.setAnchorCell(sheet.getRange(isConnected ? 'Z99' : 'S2'));

      resolve(true);
    } catch (e) {
      reject(e);
    }
  })));
}

function button(data, source /* , trigger */) {
  try {
    const _source = JSON.parse(source);
    const _data = JSON.parse(data);

    const key = `button.${_source.name}!$${_source.x}$${_source.y}`;

    const scriptProperties = PropertiesService.getScriptProperties();

    const buttonData = {};
    buttonData.data = _data;
    buttonData.source = _source;
    scriptProperties.setProperty(
      key,
      JSON.stringify(buttonData),
    );

    return +(_data.disabledText) === 0 ? _data.text : _data.disabledText;
  } catch (e) {
    return 'Loading...';
  }
}

function readConfig() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_CONFIG_NAME);
  const maxRows = sheet.getMaxRows();
  const maxColumns = sheet.getMaxColumns();
  const configs = sheet.getRange(
    2,
    1,
    maxRows - 1,
    maxColumns,
  ).getValues();
  const data = {};
  configs.forEach((config) => {
    const key = config[0];
    const value = config[1];
    data[key] = value;
  });
  return JSON.stringify(data);
}

function connect() {
  if (checkUpdate()) return;

  reset();
  eventEmitterInit();

  const htmlTemplate = HtmlService.createTemplateFromFile('src/sheetyDapp.html');
  const html = htmlTemplate
    .evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(html);
}

function afterConnect() {
  set('sys.status', '1');
  setConnect(true);
}

function checkUpdate() {
  const nowVersion = SpreadsheetApp.getActive().getRangeByName('sys.nowVersion').getValue();
  const remoteVersion = SpreadsheetApp.openById('1fOmwTyCFTCeQXXeXAfLKWn_wPTfDH70wJdR40pY3QSs').getRange('sheet1!B1').getValue();

  if (nowVersion !== remoteVersion) {
    const html = HtmlService.createHtmlOutputFromFile('src/sheetyDappUpdate.html');
    SpreadsheetApp.getUi().showModalDialog(html, 'Your Version is Outdated!');
    return true;
  }

  return false;
}

function heartbeat(tick, emitterPollingInterval) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('tick', tick);

  Utilities.sleep(+emitterPollingInterval * 3);
  const _tick = scriptProperties.getProperty('tick');
  if (_tick && +_tick > 0 && +tick === +_tick) {
    set('sys.status', 0);
    setConnect(false);
  } else if (+get('sys.status') === 0) {
    set('sys.status', 1);
    setConnect(true);
  }
}

function getContractList() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_CONTRACT_NAME);
  let values = sheet.getRange(
    1,
    1,
    1,
    2,
  ).getValues();
  const contractListLen = +values[0][1];

  if (contractListLen) {
    values = sheet.getRange(
      3,
      1,
      contractListLen,
      3,
    ).getValues();
    const contractList = [];
    for (let i = 0; i < contractListLen; i++) {
      const contractData = {
        name: values[i][0],
        address: values[i][1],
        abi: values[i][2],
      };
      contractList.push(contractData);
    }
    return JSON.stringify(contractList);
  }

  return [];
}

function getWriteDataByIndex(index) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_WRITE_NAME);
  const maxColumns = sheet.getMaxColumns();
  const values = sheet.getRange(
    2 + index,
    1,
    1,
    maxColumns,
  ).getValues();
  const writeData = {};
  writeData.index = index;
  writeData.key = values[0][0].toString();
  writeData.functionName = values[0][2].toString();
  const args = [];
  for (let j = 3; j < maxColumns; j++) {
    if (values[0][j] === '') break;
    args.push(values[0][j]);
  }
  writeData.args = args;
  return writeData;
}

function setWriteResultByIndex(writeData, result, source) {
  const scriptProperties = PropertiesService.getScriptProperties();

  if (source) {
    const buttonData = JSON.parse(scriptProperties.getProperty(source));
    const sheet = SpreadsheetApp.getActive().getSheetByName(buttonData.source.name);
    sheet.setActiveRange(sheet.getRange(1, 1));
    const range = SpreadsheetApp.getActive().getRangeByName(buttonData.data.statusNameRange);
    range.setValue(0);
  }

  const chainId = SpreadsheetApp.getActive()
    .getRangeByName('chainId')
    .getValue();
  const sheet1 = SpreadsheetApp.getActive().getSheetByName(SHEET_WRITE_NAME);
  const sheet2 = SpreadsheetApp.getActive().getSheetByName(SHEET_TXS_NAME);

  sheet1.getRange(
    2 + writeData.index,
    2,
  ).setValue(result);
  if (writeData.key !== '') {
    const range = sheet1.getRange(
      2 + writeData.index,
      2,
      1,
      1,
    );
    SpreadsheetApp.getActive().setNamedRange(
      writeData.key,
      range,
    );
  }

  // add tx
  sheet2.insertRowBefore(2);
  sheet2.getRange(
    2,
    1,
  ).setValue(writeData.functionName);
  if (result !== -1) {
    sheet2.getRange(
      2,
      2,
    ).setValue(1);
    sheet2
      .getRange(
        2,
        3,
      )
      .setValue(getEtherscanLink(
        chainId,
        result,
        'transaction',
      ));
  } else {
    sheet2.getRange(
      2,
      2,
    ).setValue(0);
  }
  sheet2.getRange(
    2,
    4,
  ).setValue(Math.round(Date.now() / 1000) / 86400 + 25569);

  return true;
}

function getReadList() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_READ_NAME);
  const maxColumns = sheet.getMaxColumns();
  const maxRows = sheet.getMaxRows();
  const readListLen = maxRows - 1;
  if (readListLen > 0) {
    values = sheet.getRange(
      2,
      1,
      readListLen,
      maxColumns,
    ).getValues();
    const readList = [];
    for (let i = 0; i < readListLen; i++) {
      const readData = {};
      readData.key = values[i][0].toString();
      readData.functionName = values[i][2].toString();
      const args = [];
      for (let j = 3; j < maxColumns; j++) {
        if (values[i][j] === '') break;
        args.push(values[i][j]);
      }
      readData.args = args;
      readList.push(readData);
    }
    return readList;
  }

  return [];
}

function setReadListResult(keyList, resultList) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_READ_NAME);
  sheet.getRange(
    2,
    2,
    resultList.length,
    1,
  ).setValues(resultList.map((result, index) => {
    if (keyList[index] !== '') {
      const range = sheet.getRange(
        2 + index,
        2,
        1,
        1,
      );
      // TODO check name range is exits
      SpreadsheetApp.getActive().setNamedRange(
        keyList[index],
        range,
      );
    }
    return [result];
  }));

  return true;
}

function initSys() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_SYS_NAME);
  const namedRanges = [
    {
      name: 'sys.status',
      range: 'B3',
    },
    {
      name: 'sys.nowVersion',
      range: 'B4',
    },
    {
      name: 'sys.remoteVersion',
      range: 'B5',
    },
  ];
  Promise.all(namedRanges.map((namedRange) => new Promise((resolve, reject) => {
    try {
      SpreadsheetApp.getActive().setNamedRange(namedRange.name, sheet.getRange(namedRange.range));
      resolve(true);
    } catch (e) {
      reject(e);
    }
  })));
}

function initConnectButton() {
  const filterList = [
    SHEET_TXS_NAME,
    SHEET_READ_NAME,
    SHEET_WRITE_NAME,
    SHEET_ABI_NAME,
    SHEET_CONTRACT_NAME,
    SHEET_BUTTON_NAME,
    SHEET_SYS_NAME,
    SHEET_CONFIG_NAME,
  ];
  connectButton = [];
  Promise.all(
    SpreadsheetApp.getActive().getSheets().map((sheet) => new Promise((resolve, reject) => {
      try {
        const sheetName = sheet.getName();
        if (!filterList.includes(sheetName)) {
          sheet.getImages().forEach((image, index) => {
            if (image.getAltTextTitle() === 'CONNECT_BUTTON') {
              connectButton.push({
                sheetName,
                index,
              });
            }
          });
        }
        resolve(true);
      } catch (e) {
        reject(e);
      }
    })),
  );

  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('connectButton', JSON.stringify(connectButton));
  console.log(scriptProperties.getProperty('connectButton'));
}

function reset() {
  set('sys.status', 0);
  const clearSheetNameList = [SHEET_BUTTON_NAME, SHEET_WRITE_NAME, SHEET_READ_NAME];
  Promise.all(clearSheetNameList.map((clearSheetName) => new Promise((resolve, reject) => {
    try {
      const sheet = SpreadsheetApp.getActive().getSheetByName(clearSheetName);
      sheet.getRange(2, 2, sheet.getMaxRows() - 1, 1).clearContent();
      resolve(true);
    } catch (e) {
      reject(e);
    }
  })));
}

function clearTxs() {
  const sheet0 = SpreadsheetApp.getActive().getSheetByName(SHEET_TXS_NAME);
  sheet0.getRange(
    2,
    1,
    1000,
    4,
  ).clearContent();
}
