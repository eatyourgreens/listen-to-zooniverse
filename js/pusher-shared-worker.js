importScripts('https://js.pusher.com/3.1/pusher.min.js');

var ports = [];
var initialized = false;

function broadcast(channel, event, data) {
  ports.forEach(function (port) {
    try {
      port.postMessage({
        channel: channel,
        event: event,
        data: data
      });
    } catch (error) {
      // Port may be closed in another tab; ignore and continue.
    }
  });
}

function initializePusher() {
  if (initialized) return;
  initialized = true;

  var pusher = new Pusher('79e8e05ea522377ba6db');
  var panoptes = pusher.subscribe('panoptes');
  var ouroboros = pusher.subscribe('ouroboros');
  var talk = pusher.subscribe('talk');

  panoptes.bind('classification', function (data) {
    broadcast('panoptes', 'classification', data);
  });
  talk.bind('comment', function (data) {
    broadcast('talk', 'comment', data);
  });
  ouroboros.bind('classification', function (data) {
    broadcast('ouroboros', 'classification', data);
  });
  ouroboros.bind('comment', function (data) {
    broadcast('ouroboros', 'comment', data);
  });
}

onconnect = function (event) {
  var port = event.ports[0];
  ports.push(port);
  port.start();
  initializePusher();
};
