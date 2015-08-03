var blessed = require('blessed');
 
// Create a screen object. 
var screen = blessed.screen({
  autoPadding: true,
  smartCSR: true
});
 
screen.title = 'my window title';

var layout = blessed.layout({
  width: '100%',
  height: '100%',
  parent: screen,
})

var leftpane = blessed.layout({
  width: '40%',
  height: '100%',
  parent: layout,
});

var rightpane = blessed.layout({
  width: '60%',
  height: '100%',
  parent: layout
});

var pusher_list_title = blessed.text({
  align: 'center',
  content: 'Detected PixelPushers',
  parent: leftpane
}); 


var selected_pusher_title = blessed.text({
  align: 'center',
  content: 'Selected Pusher MAC: ',
  parent: rightpane
}); 

// Create a box perfectly centered horizontally and vertically. 
var list = blessed.List({
  parent: leftpane,
  items: ['CA4E2A8ACE03', '0DA7E89B615A','84D75B9B32EC','E413AF34D41F'],
  border: {
    type: 'line'
  },
  selectedBg: 'green',
  mouse: true,
  keys: true,
  width: '100%',
});
 
// Append our box to the screen. 
screen.append(layout);
 
// Quit on Escape, q, or Control-C. 
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});
 
// Focus our element. 
list.focus();
 
// Render the screen. 
screen.render();