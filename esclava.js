function displayState(state) {
  if (state == "pending") return "Esperando jugadores...";
  else if (state == "playing") return "Jugando";
  else return "Terminado";
}

$(document).ready(function () {
  let userName = prompt("Nombre de usuario?");

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
        .text("Unirse");
      $row.append($("<td>").append($btn));
      $tbody.append($row);
    });
  });

  $("#new-game-button").on("click", function () {
    db.collection("games").add({
      timestamp: new Date(),
      state: "pending",
      playerNames: [userName]
    });
  });
});
