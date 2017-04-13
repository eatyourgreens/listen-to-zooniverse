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

var loaded_sounds = 0;
var sound_totals = 51;
var sound_load = function(r) {
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
for (var i = 1; i <= 24; i++) {
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
for (var i = 1; i <= 3; i++) {
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

(function loadPanoptesProjects() {
  var request = new XMLHttpRequest();
  request.open('GET', "https://www.zooniverse.org/api/projects/?page=1&page_size=100&launch_approved=true");
  request.setRequestHeader('Accept', 'application/vnd.api+json; version=1');
  request.setRequestHeader('Content-Type', 'application/json');
  request.send();
  request.onload = function (e) {
    var projects = JSON.parse( this.responseText ).projects;
    projects.forEach( function (project) {
      panoptes_projects[project.id] = project;
    })
  }
})();

var ouroboros_projects = {};

(function loadProjects() {
  // List of identifiers to ignore (i.e. Not show)
  ignore_these = ["m83", "impossible_line", "leaf", "cancer_gene_runner", "galaxy_zoo_starburst", "galaxy_zoo_quiz"]

  // Get .ist of projects from API annd create items for display
  var request = new XMLHttpRequest();
  request.open('GET', "https://api.zooniverse.org/projects/list");
  request.send();
  request.onload = function (e) {
    var projects = JSON.parse( this.responseText);
    projects.forEach( function (project){
      ouroboros_projects[project.name] = project.display_name;
    });
  };
})();


var pusher = new Pusher('79e8e05ea522377ba6db');
var panoptes = pusher.subscribe('panoptes');
var ouroboros = pusher.subscribe('ouroboros');
var talk = pusher.subscribe('talk');

panoptes.bind('classification', function(data) {
  var user_id = ( !!data.user_id ) ? parseInt( data.user_id ) : 0;
  var project = parseInt(data.project_id) + parseInt(data.workflow_id) + user_id + parseInt(data.classification_id);
  var colour = project % 16777216;
  var index = project % (clav.length - 1);
  var image = data.subject_urls[0];
  var image_type = Object.keys(image)[0]
  var image = image[image_type] || '';
  clav[index].play();
  !!panoptes_projects[data.project_id] && draw_circle(index + 10, '#' + colour.toString(16), panoptes_projects[data.project_id].display_name, image);
  // console.log( "panoptes classification", data );
});
talk.bind('comment', function(data) {
  var index = Math.round(Math.random() * (swells.length - 1));
  var colour = data.project_id % 16777216;
  swells[index].play();
  draw_circle(10 + index * 10, '#' + colour.toString(16), data.body, '');
  console.log("panoptes comment", data);
});

ouroboros.bind('classification', function(data) {
  var index = (data.project + data.subjects + data.user_name).length;
  var red = data.project.length % 256;
  var green = data.subjects.length % 256;
  var blue = data.user_name.length % 256
  index = index % (celesta.length - 1);

  celesta[index].play();
  draw_circle(index + 10, '#' + red.toString(16) + green.toString(16) + blue.toString(16), ouroboros_projects[data.project], '');
  // console.log( "ouroboros classification", data );
});
ouroboros.bind('comment', function(data) {
  var red = data.body.length % 256;
  var green = data.zooniverse_id.length % 256;
  var blue = data.user_zooniverse_id.length % 256;
  var index = Math.round(Math.random() * (swells.length - 1));
  swells[index].play();
  draw_circle(10 + index * 10, '#' + red.toString(16) + green.toString(16) + blue.toString(16), data.body, '');
  console.log("ouroboros comment", data);
});

draw_circle = function(size, edit_color, label, image_url) {
  console.log(label);
  var x = Math.random() * (window.innerWidth - size) + size;
  var y = Math.random() * (window.innerHeight - size) + size;

  var circle_group = svg.append('g')
    .attr('transform', 'translate(' + x + ', ' + y + ')')
    .attr('fill', edit_color)
    .style('opacity', 0.5)

  var ring = circle_group.append('circle')
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

  var circle = circle_group.append('circle')
    .attr('r', size)
    .transition()
    .duration(60000)
    .style('opacity', 0)
    .each('end', function() {
      circle_group.remove();
    })
    .remove();

    if (image_url) {
      image_url = image_url.replace('https://', '');
      image_url = image_url.replace('http://', '');
      image_url = image_url.replace('static.zooniverse.org/', '');
      var image = circle_group.append('image')
        .attr('href', 'https://thumbnails.zooniverse.org/100x150/' + image_url)
        .attr('transform', 'translate(-50, -50)')
        .transition()
        .duration(30000)
        .style('opacity', 0)
        .remove()
    }
  
    if (label) {
      var label = circle_group.append('text')
        .text(label)
        .classed('comment-body', true)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fd6')
        .transition()
        .delay(1000)
        .style('opacity', 0)
        .duration(30000)
        .remove();
    }
}
