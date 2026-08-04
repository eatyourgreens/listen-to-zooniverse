importScripts('/js/pusher.worker.min.js');

let portRegister = [];
let pusher = null;

function hasVisiblePort() {
  return portRegister.some(({ hidden }) => !hidden);
}

function suspendPusher() {
  if (pusher && !hasVisiblePort()) {
    pusher.disconnect();
  }
}

function resumePusher() {
  if (pusher && hasVisiblePort()) {
    pusher.connect();
  }
}

function broadcast(channel, event, data) {
  portRegister = portRegister.filter(function ({ port }) {
    try {
      port.postMessage({
        channel: channel,
        event: event,
        data: data
      });
      return true;
    } catch (error) {
      // Port may be closed in another tab; ignore and continue.
      return false;
    }
  });
}

function initializePusher() {
  if (pusher) return;

  pusher = new Pusher('79e8e05ea522377ba6db');
  const panoptes = pusher.subscribe('panoptes');
  const talk = pusher.subscribe('talk');

  panoptes.bind('classification', function (data) {
    broadcast('panoptes', 'classification', data);
  });
  talk.bind('comment', function (data) {
    broadcast('talk', 'comment', data);
  });
}

onconnect = function (event) {
  const port = event.ports[0];
  const entry = { port: port, hidden: true };
  portRegister.push(entry);
  port.start();
  port.onmessage = function (messageEvent) {
    const message = messageEvent.data || {};
    if (message.type === 'visibilitychange') {
      entry.hidden = !!message.hidden;
      if (entry.hidden) {
        suspendPusher();
      } else {
        resumePusher();
      }
    }
  };
  initializePusher();
};
