$(function () {
  //We'll use message to tell the user what's happening
  var $message = $('#message');

  //Get handle to the game board buttons
  var $buttons = $('#board .board-row button');

  //Our interface to the Sync service
  var syncClient;

  //We're going to use a single Sync document, our simplest
  //synchronisation primitive, for this demo
  var syncDoc;

  fabric.Canvas.prototype.getItemByName = function(name) {
    var object = null,
        objects = this.getObjects();

    for (var i = 0, len = this.size(); i < len; i++) {
      if (objects[i].id && objects[i].id === name) {
        object = objects[i];
        break;
      }
    }

    return object;
  };

  var canvas = new fabric.Canvas('theWhiteboard');
  canvas.setHeight(500);
  canvas.setWidth(800);

  canvas.on('object:added', function(evt) {
      console.log(evt)
  })

  canvas.on('object:modified', function (evt) {
      console.log(evt);
  });

  //Get an access token for the current user, passing a device ID
  //In browser-based apps, every tab is like its own unique device
  //synchronizing state -- so we'll use a random UUID to identify
  //this tab.
  $.getJSON('/token', function (tokenResponse) {
    //Initialize the Sync client
    syncClient = new Twilio.Sync.Client(tokenResponse.token, { logLevel: 'info' });

    //Let's pop a message on the screen to show that Sync is ready
    $message.html('Sync initialized!');

    //Now that Sync is active, lets enable our game board
    $buttons.attr('disabled', false);

    //This code will create and/or open a Sync document
    //Note the use of promises
    syncClient.map('theWhiteboard').then(function(map) {
      //Lets store it in our global variable
      map.on("itemAdded", function(e) { console.log('ItemAdded', e); });

      //Initialize game board UI to current state (if it exists)
      map.getItems().then(function(page) {
        if (page.items.length == 0) {
          //
          // BOOTSTRAP
          //
          // create a rectangle object
          let rect1 = new fabric.Rect({
            id: "dog",
            left: 100,
            top: 100,
            fill: 'red',
            width: 20,
            height: 20
          });

          // "add" rectangle onto canvas
          canvas.add(rect1);
          let firstRect = map.set(rect1.id, _.pick(rect1, ['top', 'left', 'height', 'width', 'fill']));

          // create a rectangle object
          let rect2 = new fabric.Rect({
            id: "penis",
            left: 200,
            top: 100,
            fill: 'red',
            width: 20,
            height: 20
          });

          // "add" rectangle onto canvas
          canvas.add(rect2);

                      // "add" rectangle onto canvas
          canvas.add(rect2);
          let secondRect = map.set(rect2.id, _.extend(_.pick(rect2, ['top', 'left', 'angle', 'height', 'width', 'fill', 'scaleX', 'scaleY']), {'type': 'rectangle'}));

          Promise.all([firstRect, secondRect], function() {
            configureSyncing(map, canvas);
          })
        } else {
          _.map(page.items, function(item) {
            canvas.add(new fabric.Rect(_.extend(item.value, {id: item.key})));
          });

          configureSyncing(map, canvas);
        }
      });
    });
  });

  function configureSyncing(map, canvas) {
    map.on('itemUpdated', function(it) {
      let canvasItem = it.value
      thisRect = canvas.getItemByName(it.key);

      const animation = {
        onChange: canvas.renderAll.bind(canvas),
        duration: 500,
        easing: fabric.util.ease.easeOutBounce
      };
      thisRect.animate('left', canvasItem.left, animation);
      thisRect.animate('top', canvasItem.top, animation);
      thisRect.animate('angle', canvasItem.angle, animation)
      thisRect.animate('scaleX', canvasItem.scaleX, animation);
      thisRect.animate('scaleY', canvasItem.scaleY, animation);
    });

    canvas.on('object:modified', function (evt) {
      let newValue = _.pick(evt.target, ['top', 'left', 'angle', 'scaleX', 'scaleY']);
      map.mutate(evt.target.id, function(rectangleInMap) {
        return _.extend(rectangleInMap, newValue);
      });
    });
  }

  //Whenever a board button is clicked:
  $buttons.on('click', function (e) {
    //Toggle the value: X, O, or empty
    toggleCellValue($(e.target));

    //Update the document
    var data = readGameBoardFromUserInterface();

    //Send updated document to Sync
    //This should trigger "updated" events on other clients
    syncDoc.set(data);

  });

  //Toggle the value: X, O, or empty (&nbsp; for UI)
  function toggleCellValue($cell) {
    var cellValue = $cell.html();

    if (cellValue === 'X') {
      $cell.html('O');
    } else if (cellValue === 'O') {
      $cell.html('&nbsp;');
    } else {
      $cell.html('X');
    }
  }

  //Read the state of the UI and create a new document
  function readGameBoardFromUserInterface() {
    var board = [
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ];

    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 3; col++) {
        var selector = '[data-row="' + row + '"]' +
          '[data-col="' + col + '"]';
        board[row][col] = $(selector).html().replace('&nbsp;', '');
      }
    }

    return {board: board};
  }

  //Update the buttons on the board to match our document
  function updateUserInterface(data) {
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 3; col++) {
        var selector = '[data-row="' + row + '"]' +
          '[data-col="' + col + '"]';
        var cellValue = data.board[row][col];
        $(selector).html(cellValue === '' ? '&nbsp;' : cellValue);
      }
    }
  }

});
