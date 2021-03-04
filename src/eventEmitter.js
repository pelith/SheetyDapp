function eventEmitterInit() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const data = {
    emit: {},
  };
  scriptProperties.setProperty('event', JSON.stringify(data));
}

function emit(key, value, source) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const event = JSON.parse(scriptProperties.getProperty('event'));
  const emitData = {
    key,
    value,
    source,
  };
  event.emit[_uuid()] = emitData;
  scriptProperties.setProperty('event', JSON.stringify(event));
}

function eventEmitterRead() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const event = JSON.parse(scriptProperties.getProperty('event'));
  return event;
}

function eventEmitterDelete(uuid) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const event = JSON.parse(scriptProperties.getProperty('event'));
  delete event.emit[uuid];
  scriptProperties.setProperty('event', JSON.stringify(event));
  return true;
}
