importScripts('js/pusher.worker.min.js');

let ports = [];
let initialized = false;

function broadcast(channel, event, data) {
  ports = ports.filter(function (port) {
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
  if (initialized) return;
  initialized = true;

  const pusher = new Pusher('79e8e05ea522377ba6db');
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
  ports.push(port);
  port.start();
  initializePusher();
};
