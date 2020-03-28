let userName = null;
let currentGame = null;

function displayState(state) {
  if (state == "pending") return "Esperando jugadores...";
  else if (state == "playing") return "Jugando";
  else return "Terminado";
}

function joinGame(gameId) {
  $("#lobby").remove();
  currentGame = db.collection("games").doc(gameId);
  currentGame.update({
    playerNames: firebase.firestore.FieldValue.arrayUnion(userName)
  });
  $("#game-id").text(gameId);
  $("#game").show();
}

$(document).ready(function () {
  userName = prompt("Nombre de usuario?");

  db.collection("games").onSnapshot(snapshot => {
    let $tbody = $("#games-table tbody");
    $tbody.html("");
    snapshot.forEach((doc, i) => {
      let game = doc.data();
      let $row = $("<tr>")
        .append($("<td>").text(doc.id))
        .append($("<td>").text(displayState(game.state)))
        .append($("<td>").text(game.playerNames.join(",")));
      let $btn = $("<button>")
        .addClass("btn").addClass("btn-sm").addClass("btn-secondary")
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
});
