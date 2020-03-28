let userName = null;
let currentGame = null;
let spritesheet = null;
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

function draw() {
  if (!currentGame) return;
  if (currentGame.state == "pending") {
    drawDeck();
  }
}

function joinGame(gameId) {
  $("#lobby").hide();
  let gameRef = db.collection("games").doc(gameId);
  gameRef.onSnapshot(snapshot => currentGame = snapshot.data());
  gameRef.update({
    playerNames: firebase.firestore.FieldValue.arrayUnion(userName)
  });
  gameRef.collection("players").add({
    name: userName
  });
  gameRef.collection("players").onSnapshot(snapshot => {
    let $players = $("#players-table");
    $players.html("");
    $players.append($("<h5>").text("Jugadores:"));
    let i = 0;
    let turn = 1; // TODO(Richo)
    snapshot.forEach(doc => {
      let player = doc.data();
      let $name = $("<div>").text(player.name);

      let $row = $("<div>")
        .addClass("row")
        .append($("<div>")
          .addClass("col-md-4")
          .css("text-align", "right")
          .append($name))

        .append($("<div>")
          .addClass("col-md-4")
          //.append($("<div>").text(Math.random() * 30))
          .text("" + Math.round(Math.random() * 30) + " cartas"))

        .append($("<div>")
          .addClass("col-md-4")
          .append($star(i)));
      if (i == turn) {
        $row.addClass("turn");
        $name.prepend($("<i class='fas fa-arrow-right mr-3'></i>"));
      }
      $players.append($row);
      i++;
    });
  });
  $("#game-id").text("Código: " + gameId);
  $("#game").show();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initializeCanvas() {
  canvas = document.getElementById("world");
  ctx = canvas.getContext("2d");
  resizeCanvas();
  $(window).resize(resizeCanvas);

  function privateDraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw();
    ctx.resetTransform();
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
