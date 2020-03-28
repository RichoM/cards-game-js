let userName = null;
let currentGame = null;

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

function joinGame(gameId) {
  $("#lobby").hide();
  currentGame = db.collection("games").doc(gameId);
  currentGame.update({
    playerNames: firebase.firestore.FieldValue.arrayUnion(userName)
  });
  currentGame.collection("players").add({
    name: userName
  });
  currentGame.collection("players").onSnapshot(snapshot => {
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
  })
  $("#game-id").text(gameId);
  $("#game").show();
}

function resizeCanvas() {
  let canvas = document.getElementById("world");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initializeCanvas() {
  resizeCanvas();
  $(window).resize(resizeCanvas);
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

$(document).ready(function () {
  initializeCanvas();
  initializeLobby();
  askUserName();
});
