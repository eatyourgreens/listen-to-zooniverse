// https://stackoverflow.com/a/24785497/10951669
function wrap(text, width) {
  text.each(function () {
    var text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 1.1, // ems
      x = text.attr("x"),
      y = text.attr("y"),
      dy = 0, //parseFloat(text.attr("dy")),
      tspan = text.text(null)
        .append("tspan")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    }
  });
}

var celesta = [];
var clav = [];
var swells = [];

var body_background_color = '#f8f8f8',
  body_text_color = '#000',
  svg_background_color = '#1c2733',
  svg_text_color = '#fff',
  newuser_box_color = 'rgb(41, 128, 185)',
  bot_color = 'rgb(155, 89, 182)',
  anon_color = 'rgb(46, 204, 113)',
  edit_color = '#fff';

let loaded_sounds = 0;
const sound_totals = 51;
const sound_load = function(r) {
  loaded_sounds += 1
  if (loaded_sounds == sound_totals) {
    all_loaded = true
    console.log('Loading complete')
    console.log(celesta);
  } else {
    // console.log('Loading : ' + loaded_sounds + ' files out of ' + sound_totals)
  }
}

// load celesta and clav sounds
for (let i = 1; i <= 24; i++) {
  if (i > 9) {
    fn = 'c0' + i;
  } else {
    fn = 'c00' + i;
  }
  celesta.push(new Howl({
    urls: ['sounds/celesta/' + fn + '.ogg',
      'sounds/celesta/' + fn + '.mp3'
    ],
    volume: 0.5,
    onload: sound_load(),
  }))
  clav.push(new Howl({
    urls: ['sounds/clav/' + fn + '.ogg',
      'sounds/clav/' + fn + '.mp3'
    ],
    volume: 0.5,
    onload: sound_load(),
  }))
}

// load swell sounds
for (let i = 1; i <= 3; i++) {
  swells.push(new Howl({
    urls: ['sounds/swells/swell' + i + '.ogg',
      'sounds/swells/swell' + i + '.mp3'
    ],
    volume: 1,
    onload: sound_load(),
  }))
}

var svg = d3.select("#canvas").append("svg")
  .attr({
    width: window.innerWidth,
    height: window.innerHeight
  })
  .style('background-color', '#1c2733');

window.onresize = function(e) {
  svg.attr({
    width: window.innerWidth,
    height: window.innerHeight
  });
}

var panoptes_projects = {};

(async function loadPanoptesProjects() {
  const response = await fetch("https://www.zooniverse.org/api/projects/?page=1&page_size=200&launch_approved=true&cards=true", {
    headers: {
      Accept: 'application/vnd.api+json; version=1',
      'Content-Type': 'application/json'
    }
  });
  const body = await response.json();
  body.projects.forEach(function (project) {
    panoptes_projects[project.id] = project;
  })
})();

async function fetchProject(project_id) {
  const response = await fetch(`https://www.zooniverse.org/api/projects/${project_id}`, {
    headers: {
      Accept: 'application/vnd.api+json; version=1',
      'Content-Type': 'application/json'
    }
  });
  const body = await response.json();
  const [ project ] = body.projects;
  panoptes_projects[project.id] = project;
  return project;
}

async function getProject(project_id) {
  const project = panoptes_projects[project_id];
  return project || await fetchProject(project_id);
}

async function onPanoptesClassification(data) {
  const user_id = ( !!data.user_id ) ? parseInt( data.user_id ) : 0;
  const projectIndex = parseInt(data.project_id) + parseInt(data.workflow_id) + user_id + parseInt(data.classification_id);
  const red = parseInt(data.project_id) % 256;
  const green = parseInt(data.workflow_id) % 256;
  const blue = parseInt(user_id) % 256;
  const index = projectIndex % (clav.length - 1);
  let image = data.subject_urls[0];
  const image_type = Object.keys(image)[0]
  image = image[image_type] || '';
  clav[index].play();
  const project = await fetchProject(data.project_id);
  !!project && draw_circle(index + 10, '#' + red.toString(16) + green.toString(16) + blue.toString(16), project.display_name, image);
  // console.log( "panoptes classification", data );
}

function onTalkComment(data) {
  const index = Math.round(Math.random() * (swells.length - 1));
  const colour = data.project_id % 16777216;
  swells[index].play();
  draw_circle(10 + index * 10, '#' + colour.toString(16), data.body, '');
  console.log("Talk comment", data);
}

function handlePusherEvent(channel, event, data) {
  if (channel === 'panoptes' && event === 'classification') {
    onPanoptesClassification(data);
  } else if (channel === 'talk' && event === 'comment') {
    onTalkComment(data);
  }
}

function connectDirectPusher() {
  const pusher = new Pusher('79e8e05ea522377ba6db');
  const panoptes = pusher.subscribe('panoptes');
  const talk = pusher.subscribe('talk');

  panoptes.bind('classification', function (data) {
    handlePusherEvent('panoptes', 'classification', data);
  });
  talk.bind('comment', function (data) {
    handlePusherEvent('talk', 'comment', data);
  });
}

function connectSharedPusher() {
  const worker = new SharedWorker('js/pusher-shared-worker.js');
  worker.onerror = function (error) {
    console.warn('SharedWorker failed; using direct Pusher connection', error);
    connectDirectPusher();
  };
  worker.port.start();
  worker.port.onmessage = function (event) {
    const payload = event.data || {};
    handlePusherEvent(payload.channel, payload.event, payload.data);
  };
}

if (typeof SharedWorker === 'function') {
  try {
    connectSharedPusher();
  } catch (error) {
    console.warn('SharedWorker unavailable, using direct Pusher connection', error);
    connectDirectPusher();
  }
} else {
  connectDirectPusher();
}

draw_circle = function(size, edit_color, label, image_url) {
  console.log(label);
  const x = Math.random() * (window.innerWidth - size) + size;
  const y = Math.random() * (window.innerHeight - size) + size;

  const circle_group = svg.append('g')
    .attr('transform', 'translate(' + x + ', ' + y + ')')
    .attr('fill', edit_color)
    .style('opacity', 0.5)

  const ring = circle_group.append('circle')
    .attr({
      r: size + 20,
      stroke: 'none'
    })
    .transition()
    .attr('r', size + 40)
    .style('opacity', 0)
    .ease(Math.sqrt)
    .duration(2500)
    .remove();

  const circle = circle_group.append('circle')
    .attr('r', size)
    .transition()
    .duration(5000)
    .style('opacity', 0)
    .each('end', function() {
      circle_group.remove();
    })
    .remove();

    if (image_url) {
      image_url = image_url.replace('https://', '');
      image_url = image_url.replace('http://', '');
      image_url = image_url.replace('static.zooniverse.org/', '');
      circle_group.append('image')
        .attr('href', 'https://thumbnails.zooniverse.org/50x75/' + image_url)
        .attr('transform', 'translate(-25, -25)')
        .transition()
        .duration(5000)
        .style('opacity', 0)
        .remove()
    }
  
    if (label) {
      circle_group.append('text')
        .text(label)
        .classed('comment-body', true)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fd6')
        .attr("x", 0)
        .attr("y", 0)
        .call(wrap, 250)
        .transition()
        .delay(1000)
        .style('opacity', 0)
        .duration(10000)
        .remove();
    }
}
