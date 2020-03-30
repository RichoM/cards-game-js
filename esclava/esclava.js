let userName = null;
let playerId = null;
let currentGame = null;
let spritesheet = null;
let scrollOffset = 0;
let scrollAccel = 0;
let canvas = null;
let ctx = null;

function displayState(state) {
  if (state == "pending") return "Esperando jugadores...";
  else if (state == "playing") return "Jugando";
  else return "Terminado";
}

function $star(n) {
  n = n || 1;
  let $span = $("<span>").css("color", "gold");
  for (let i = 0; i < n; i++) {
    $span.append($("<i>").addClass("fas").addClass("fa-star"));
  }
  return $span;
}

function drawCard(card) {
  ctx.drawImage(card, -card.width/2, -card.height/2);
}

function drawDeck() {
  spritesheet.then(cards => {
    let card = cards[49];
    ctx.translate(canvas.width/2, canvas.height/2);
    let inc = 3;
    let steps = 5;
    for (let i = 0; i < steps; i++) {
      drawCard(card);
      ctx.translate(inc, -inc);
    }
  });
}

let origin = null;
let radius = null;
let angle = 5; // degrees

let min = null;
let max = null;

function scroll(begin, end) {
  hdist = end.x - begin.x;
  scrollAccel += hdist * 0.01;
  console.log("SCROLL: " + hdist);
}

function drawHand(hand) {

  function suitIndex(suit) {
    let suits = ["oro", "copa", "espada", "basto"];
    return suits.indexOf(suit);
  }
  function cardIndex(card) {
    return (card.number - 1) + suitIndex(card.suit) * 12;
  }

  spritesheet.then(sprites => {
    let imgs = hand.map(cardIndex).map(i => sprites[i]);

    radius = canvas.height * 1.13;
    origin = {x: canvas.width/2, y: canvas.height + radius - (imgs[0].height * 0.25)};

    min = -angle * (imgs.length / 2);
    max = angle * (imgs.length / 2);
    if (scrollOffset < min + angle) scrollOffset = min + angle;
    if (scrollOffset > max - angle) scrollOffset = max - angle;

    ctx.translate(origin.x, origin.y);
    ctx.rotate(min * Math.PI / 180);
    ctx.rotate(scrollOffset * Math.PI / 180);

    imgs.forEach((img, i) => {
      ctx.rotate(angle * Math.PI / 180);
      ctx.translate(0, -radius);
      drawCard(img);
      ctx.translate(0, radius);
    });
    /*
    let step = 60;
    ctx.translate(canvas.width/2 + scrollOffset, canvas.height - 40);
    ctx.translate(-step * (imgs.length/2), 0);
    imgs.forEach(img => {
      drawCard(img);
      ctx.translate(step, 0);
    });
    */
  });
}

function draw(delta) {
  if (!currentGame) return;
  if (currentGame.state == "pending") {
    drawDeck();
  } else if (currentGame.state = "playing") {
    let player = currentGame.players.find(p => p.id == playerId);
    if (player && player.cards.length > 0) {
      drawHand(player.cards);
    }
  }

  scrollOffset += scrollAccel;
  if (Math.abs(scrollAccel) > 0.0001) {
    scrollAccel /= 70 * delta;
  } else {
    scrollAccel = 0;
  }
}

function updateGame(game) {
  game.players = currentGame ? currentGame.players : [];
  currentGame = game;
  updateUI();
}

function updatePlayers(players) {
  currentGame.players = players;
  updateUI();
}

function updateUI() {
  let $players = $("#players-table");
  $players.html("");
  $players.append($("<h5>").text("Jugadores:"));
  let turn = currentGame.turn;
  currentGame.players.forEach((player, i) => {
    let $name = $("<div>").text(player.name);

    let $row = $("<div>")
      .addClass("row")
      .append($("<div>")
        .addClass("col-md-4")
        .css("text-align", "right")
        .append($name));

    if (player.cards.length > 0) {
      let msg = player.cards.length == 1 ?
                  "1 carta" : player.cards.length + " cartas";
      $row.append($("<div>")
        .addClass("col-md-4")
        .text(msg));
    }

    // TODO(Richo): Use stars to count wins
    if (false) {
      $row.append($("<div>")
        .addClass("col-md-4")
        .append($star(0)));
    }

    if (i == turn) {
      $row.addClass("turn");
      $name.prepend($("<i class='fas fa-arrow-right mr-3'></i>"));
    }
    $players.append($row);
  });
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function startGame() {
  let deck = [];
  let suits = ["oro", "copa", "espada", "basto"];
  suits.forEach((suit, i) => {
    for (let i = 1; i <= 12; i++) {
      deck.push({ number: i, suit: suit });
    }
  });
  shuffle(deck);

  let players = currentGame.players;
  let hands = players.map(each => []);
  let i = 0;
  while (deck.length > 0) {
    hands[i].push(deck.pop());
    i = (i + 1) % players.length;
  }

  players.forEach((player, i) => {
    db.collection("games").doc(currentGame.id).collection("players").doc(player.id).update({
      cards: hands[i]
    })
  });
}

function joinGame(gameId) {
  $("#lobby").hide();

  let gameRef = db.collection("games").doc(gameId);

  gameRef.onSnapshot(snapshot => {
    let data = snapshot.data();
    data.id = snapshot.id;
    updateGame(data);
  });
  gameRef.collection("players").onSnapshot(snapshot => {
    let players = [];
    snapshot.forEach(doc => {
      let data = doc.data();
      data.id = doc.id;
      players.push(data);
    });
    updatePlayers(players);
  });

  gameRef.update({
    playerNames: firebase.firestore.FieldValue.arrayUnion(userName)
  });
  gameRef.collection("players").add({
    name: userName,
    cards: []
  }).then(doc => playerId = doc.id);

  $("#start-game-button").on("click", function () {
    $("#start-game-button").hide();
    gameRef.update({
      turn: Math.floor(Math.random() * currentGame.players.length),
      state: "playing"
    }).then(startGame);
  });

  $("#game-id").text("Código: " + gameId);
  $("#start-game-button").show();
  $("#game").show();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initializeCanvasEvents() {

	// Get the position of the mouse relative to the canvas
	function getMousePos(canvasDom, mouseEvent) {
		var rect = canvasDom.getBoundingClientRect();
		return {
			x: mouseEvent.clientX - rect.left,
			y: mouseEvent.clientY - rect.top
		};
	}

	// Get the position of a touch relative to the canvas
	function getTouchPos(canvasDom, touchEvent) {
		var rect = canvasDom.getBoundingClientRect();
		return {
			x: touchEvent.touches[0].clientX - rect.left,
			y: touchEvent.touches[0].clientY - rect.top
		};
	}

  let scrollBegin = null;
  let scrollEnd = null;

  canvas.addEventListener("touchstart", function (e) {
    scrollBegin = getTouchPos(canvas, e);
  }, false);
  canvas.addEventListener("touchend", function (e) {
    if (scrollBegin != null) {
      scroll(scrollBegin, getTouchPos(canvas, e));
      scrollBegin = null;
      scrollEnd = null;
    }
  }, false);
  canvas.addEventListener("touchmove", function (e) {
    if (scrollBegin != null) {
      scrollEnd = getTouchPos(canvas, e);
      scroll(scrollBegin, scrollEnd);
      scrollBegin = scrollEnd;
    }
  }, false);

  canvas.addEventListener("mousedown", function (e) {
    scrollBegin = getMousePos(canvas, e);
  }, false);
  canvas.addEventListener("mouseup", function (e) {
    if (scrollBegin != null) {
      scroll(scrollBegin, getMousePos(canvas, e));
      scrollBegin = null;
      scrollEnd = null;
    }
  }, false);
  canvas.addEventListener("mousemove", function (e) {
    if (scrollBegin != null) {
      scrollEnd = getMousePos(canvas, e);
      scroll(scrollBegin, scrollEnd);
      scrollBegin = scrollEnd;
    }
  }, false);

}

function initializeCanvas() {
  canvas = document.getElementById("world");
  ctx = canvas.getContext("2d");

  initializeCanvasEvents();
  resizeCanvas();
  $(window).resize(resizeCanvas);

  let last = 0;
  function privateDraw(now) {
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let delta = (now - last) / 1000;
    draw(delta);
    last = now;
    requestAnimationFrame(privateDraw);
  }
  privateDraw();
}

function askUserName() {
  userName = localStorage.getItem("user-name");
  while (userName == undefined || userName.trim() == "") {
    userName = prompt("Nombre de usuario?");
  }
  localStorage.setItem("user-name", userName);
  $("#user-name").text("¡Hola, " + userName + "!");
  $("#lobby").show();
}

function initializeLobby() {
  db.collection("games").onSnapshot(snapshot => {
    let $tbody = $("#games-table tbody");
    $tbody.html("");
    snapshot.forEach((doc, i) => {
      let game = doc.data();
      let $row = $("<tr>")
        .append($("<td>").text(doc.id))
        .append($("<td>").text(displayState(game.state)))
        .append($("<td>").text(game.playerNames.join(", ")));
      let $btn = $("<button>")
        .addClass("btn").addClass("btn-sm").addClass("btn-outline-info")
        .text("Unirse")
        .on("click", () => joinGame(doc.id));
      $row.append($("<td>").append($btn));
      $tbody.append($row);
    });
  });

  $("#new-game-button").on("click", function () {
    $("#lobby").remove();
    db.collection("games").add({
      timestamp: new Date(),
      state: "pending",
      playerNames: []
    }).then(doc => joinGame(doc.id));
  });

  $("#change-name-button").on("click", function () {
    localStorage.setItem("user-name", "");
    askUserName();
  })
}

function loadSpritesheet(src, w, h, max) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = function () {
      let rows = img.width / w;
      let cols = img.height / h;
      if (max == undefined) { max = rows * cols; }
      let pieces = [];
      for (let j = 0; j < cols; j++) {
        for (let i = 0; i < rows; i++) {
          if (pieces.length < max) {
            let canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            let ctx = canvas.getContext("2d");
            ctx.drawImage(img, i*w, j*h, w, h, 0, 0, w, h);
            let temp = new Image();
            pieces.push(new Promise((resolve, reject) => {
              temp.onload = function () {  resolve(temp); }
              temp.src = canvas.toDataURL();
            }));
          }
        }
      }
      Promise.all(pieces).then(resolve);
    };
    img.src = src;
  });
}

function initializeSpritesheet() {
  spritesheet = loadSpritesheet("cards.png", 208, 319, 50);
}

$(document).ready(function () {
  initializeCanvas();
  initializeLobby();
  initializeSpritesheet();
  askUserName();
});
