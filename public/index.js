"use strict"

$(function () {
  var canvas = new fabric.Canvas('theWhiteboard');
  canvas.setHeight(470);
  canvas.setWidth(770);
  attachLoggingToCanvas(canvas);
  attachPencilButtonToCanvas(canvas);

  // Every Sync app needs a backend to provision a token. The Sync client uses this token
  // to interact directly with the Twilio Sync backend from the browser.
  //
  $.getJSON('/token', function(tokenResponse) {

    // Initialize the Sync client
    //
    const syncClient = new Twilio.Sync.Client(tokenResponse.token);
    $('#message').html('Sync initialized!');

    // Open a Sync Map describing this whiteboard, page through anything
    // that's already there.
    //
    syncClient.map('myGreatWhiteboard').then(function(map) {
      attachLoggingToSyncMap(map);

      // Sync any new drawn objects, here or remotely.
      //
      wireNewItemEventsBetweenMapAndCanvas(map, canvas);

      // Load any the existing whiteboard data.
      //
      let readPage = function(page) {
        for (let item of page.items) {
          console.log("Twilio Sync: Loading item", item.key, item.value);
          addRemoteItemToLocalCanvas(item, canvas)
        };

        if (page.hasNextPage)
          page.nextPage().then(readPage);
      }

      map.getItems().then(readPage);
   });
  })
});

/**
 * Given an initialized Sync Map and a Canvas to draw on, this method attaches
 * event handlers that convert local drawing events into Sync data updates and
 * vice-versa.
 *
 * @param map is an open Sync Map.
 * @param canvas is a running fabric.js Canvas.
 */
function wireNewItemEventsBetweenMapAndCanvas(map, canvas) {

  ///////////////////////////////
  // Events incoming from Sync //
  ///////////////////////////////

  map.on('itemAdded', function(it, isLocalEcho) {
    // Suppresses echo: a local object, now sync'd, doesn't need to be drawn again
    //
    if (! isLocalEcho)
      addRemoteItemToLocalCanvas(it, canvas);
  });

  map.on('itemUpdated', function(item, isLocalEcho) {
    if (! isLocalEcho)
      updateLocalItemPerRemote(item.key, item.value, canvas);
  });


  ////////////////////////////////////
  // Local Fabric.js Drawing Events //
  ////////////////////////////////////

  canvas.on('object:added', function(evt) {
    // Suppresses echo: a remote object, now drawn locally, doesn't need to be Sync'd again.
    //
    const the_object = evt.target;
    if (! the_object.id) {
      the_object.set('id', newUuid());
      map.set(the_object.id, _.extend(the_object.toObject(), {type: the_object.get('type')}));
    }
  });

  canvas.on('object:modified', function(evt) {
    let updateRemoteObject = function(localObject) {
      let objectData = localObject.toJSON();
      map.set(localObject.id, objectData);
    }

    if (evt.target.type != 'group') {
      updateRemoteObject(evt.target)
    } else {
      //
      // We don't synchronized groups (e.g. selection of multiple objects).

      for (let it of evt.target.getObjects())
        updateRemoteObject(ungroupedVersionOf(it));
    }
  });

}

//---------------------------------------------------
// Log lines, to help us understand our application
//---------------------------------------------------
function attachLoggingToCanvas(canvas) {
  canvas.on('object:added',    function(evt) {console.log("Fabric.js:", evt.target.get('type'), "added",    evt)});
  canvas.on('object:modified', function(evt) {console.log("Fabric.js:", evt.target.get('type'), "modified", evt)});
}

function attachLoggingToSyncMap(map) {
  map.on("itemAdded",   function(it, isLocalEcho) { console.log('Twilio Sync: Map item', it.key, 'added',   isLocalEcho? 'locally' : 'remotely', it); });
  map.on("itemUpdated", function(it, isLocalEcho) { console.log('Twilio Sync: Map item', it.key, 'updated', isLocalEcho? 'locally' : 'remotely', it); });
}
//---------------------------------------------------



////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////// Code below is more about drawing than Syncing ///////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////



function addRemoteItemToLocalCanvas(item, canvas) {
  fabric.util.enlivenObjects([item.value], function(objects) {
    for(let o of objects) {
      o.set('id', item.key);
      canvas.add(o);
    };
  });
}

function updateLocalItemPerRemote(itemName, remoteItemData, canvas) {
  fabric.util.enlivenObjects([remoteItemData], function(remoteItem) {
    let localDrawnItem = canvas.getItemByName(itemName);

    const animatedProperties = ['left', 'top', 'scaleX', 'scaleY', 'angle', 'skewX', 'skewY'];
    const animation = {
      onChange: canvas.renderAll.bind(canvas),
      duration: 500,
      easing: fabric.util.ease.easeOutBounce
    };

    // Groups cause interesting aberrations when drawing. This covers many of them.
    //
    let transformedProperties = localDrawnItem.group
      ? wellNamedMatrixComponentsFrom(
        fabric.util.qrDecompose(
          fabric.util.multiplyTransformMatrices(
            remoteItem.calcTransformMatrix(),
            fabric.util.invertTransform(localDrawnItem.group.calcTransformMatrix()), false)))
      : remoteItemData;

    localDrawnItem.animate(_.pick(transformedProperties, animatedProperties), animation);
    localDrawnItem.set(_.omit(remoteItemData, animatedProperties));
  });
}

/**
 * This supremely useful utility function really should be part of fabric.js
 * itself. But in the meantime, we'll monkey-patch it in.
 */
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

function newUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
       var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
       return v.toString(16);
     });
}

function ungroupedVersionOf(object) {
  // Fabric groups mean the contained objects are translated. This isn't useful for
  // the other side.
  //
  let matrixComponents = fabric.util.qrDecompose(object.calcTransformMatrix());
  return _.extend(_.clone(object), wellNamedMatrixComponentsFrom(matrixComponents));
}

function wellNamedMatrixComponentsFrom(rawTransformationMatrix) {
  return _.omit(
    _.extend(rawTransformationMatrix,
      { left: rawTransformationMatrix.translateX,
        top: rawTransformationMatrix.translateY}),
    ['translateX', 'translateY']);
}

function attachPencilButtonToCanvas(canvas) {
  canvas.freeDrawingBrush.width = 4;
  const colors = ['red', 'black', 'green', 'blue', 'gray', 'brown', 'orange'];
  canvas.freeDrawingBrush.color = colors[Math.floor(Math.random() * colors.length)];
  canvas.isDrawingMode = $('#pencil').hasClass('active');

  $('#pencil').click(function() {
    let self = $('#pencil');
    if (self.hasClass('active')) {
      self.removeClass('active btn-success');
      self.addClass('btn-default');
      $("#pencil > span").text("Not Free-Drawing");
      canvas.isDrawingMode = false;
    } else {
      self.removeClass('btn-default');
      self.addClass('active btn-success');
      $("#pencil > span").text("Free-Drawing…");
      canvas.isDrawingMode = true;
    }
  });
}
