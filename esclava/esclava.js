let userName = null;
let playerId = null;
let currentGame = null;
let spritesheet = null;
let scrollOffset = 0;
let scrollAccel = 0;
let selectedCards = new Set();
let discardedTransforms = [];
let lastMove = "";
let canvas = null;
let ctx = null;
let lastPlayer = null;
let exchange = false;

let root = "games_dev";

function displayState(state) {
  if (state == "pending") return "Esperando jugadores...";
  else if (state == "playing") return "Jugando";
  else return "Terminado";
}

function $star(n) {
  n = n || 1;
  let $span = $("<span>").css("color", "gold");
  $span.append($("<i>").addClass("fas").addClass("fa-star"));
  $span.append($("<span>").addClass("ml-1").text(n));
  return $span;
}

let origin = null;
let click_radius = null;
let angle = 5; // degrees

let min = null;
let max = null;

function dist(a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function scroll(begin, end) {
  hdist = end.x - begin.x;
  scrollAccel = hdist * 0.025;
}

function getCurrentPlayer() {
  let players = getActivePlayers(currentGame);
  if (currentGame.turn < 0 || currentGame.turn >= players.length) return null;
  return players[currentGame.turn];
}

function click(pos) {
  let player = getCurrentPlayer();
  if (currentGame.state == "exchanging") {
    player = currentGame.players.find(p => p.id == playerId);
  } else if (currentGame.state == "playing") {
    if (!player || player.id != playerId) return;
  }

  let d = dist(pos, origin);
  if (d < click_radius) {
    let playerHand = getHand(player);
    if (playerHand.length == 0) return;

    let click_angle = -1 * (Math.atan2(origin.x - pos.x, origin.y - pos.y) * (180 / Math.PI));
    let angles = playerHand.map((card, i) => min + scrollOffset + angle * i);
    let min_dist = null;
    let min_i = null;
    angles.forEach((angle, i) => {
      let angle_dist = Math.abs(click_angle - angle);
      if (min_dist == null || angle_dist < min_dist) {
        min_i = i;
        min_dist = angle_dist;
      }
    });
    if (min_i != null) {
      if (currentGame.state == "exchanging") {
        let playerIndex = currentGame.previousRanking.indexOf(playerId);
        if (playerIndex < (currentGame.previousRanking.length >= 4 ? 2 : 1)) {
          // We are one of the masters
          let nrecv = playerIndex == 0 ? 2 : 1;
          if (min_i >= playerHand.length - nrecv) return;
        }
      }
      if (selectedCards.has(min_i)) {
        selectedCards.delete(min_i);
      } else {
        selectedCards.add(min_i);
      }
    }
  }
  updateUI();
}



function drawCard(card) {
  ctx.drawImage(card, -card.width/2, -card.height/2);
}

function drawDeck() {
  spritesheet.then(cards => {
    let card = cards[49];
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(0.8, 0.8);
    let inc = 3;
    let steps = 5;
    for (let i = 0; i < steps; i++) {
      drawCard(card);
      ctx.translate(inc, -inc);
    }
  });
}

function suitIndex(suit) {
  let suits = ["oro", "copa", "espada", "basto"];
  return suits.indexOf(suit);
}

function cardIndex(card) {
  return (card.number - 1) + suitIndex(card.suit) * 12;
}

function rnd(min, max) {
  return Math.random() * (max - min) + min;
}

function drawDiscarded(cards) {
  spritesheet.then(sprites => {
    let imgs = cards.map(cardIndex).map(i => sprites[i]);

    imgs.forEach((card, i) => {
      let t = discardedTransforms[i];

      ctx.resetTransform();
      ctx.translate(canvas.width/2, canvas.height/2 - card.height*0.25);
      ctx.scale(0.8, 0.8);

      if (!t) {
        t = {
          x: rnd(-15, 15),
          y: rnd(-10, 10),
          r: rnd(-15, 15) * Math.PI/180
        };
        discardedTransforms.push(t);
      }

      ctx.translate(t.x, t.y);
      ctx.rotate(t.r);

      drawCard(card);
    });

  });
}

function drawHand(hand) {
  if (hand.length == 0) return;
  spritesheet.then(sprites => {
    let imgs = hand.map(cardIndex).map(i => sprites[i]);

    click_radius = Math.max(canvas.height, canvas.width) * 1.13 + imgs[0].height;
    click_radius = 1900;

    let radius = click_radius - imgs[0].height;
    origin = {x: canvas.width/2, y: canvas.height + radius - (imgs[0].height * 0.25)};

    min = -angle * (imgs.length / 2);
    max = angle * (imgs.length / 2);

    let leftLimit = min + angle;
    let rightLimit = max - angle;
    if (leftLimit > rightLimit) {
      leftLimit = -angle/2;
      rightLimit = angle/2;
    }
    if (scrollOffset < leftLimit) {
      scrollAccel = Math.min(0.35, (leftLimit - scrollOffset) * 0.5); // 0.35
    }
    if (scrollOffset > rightLimit) {
      scrollAccel = Math.max(-0.35, (rightLimit - scrollOffset) * 0.5);
    }

    ctx.resetTransform();
    ctx.translate(origin.x, origin.y);
    ctx.rotate(min * Math.PI / 180);
    ctx.rotate(scrollOffset * Math.PI / 180);

    imgs.forEach((img, i) => {
      let selected = selectedCards.has(i);
      ctx.translate(0, -(radius + (selected ? img.height*0.2 : 0)));
      drawCard(img);

      /*
      // NOTE(Richo): Draw some text on the top of the card for debugging purposes
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("" + i + " - " + (min + scrollOffset + angle * i).toFixed(2), 0, -(img.height/2 + 10));
      */

      ctx.translate(0, (radius + (selected ? img.height*0.2 : 0)));
      ctx.rotate(angle * Math.PI / 180);
    });
  });
}

function getHand(player) {
  if (!player || !player.cards) return [];
  return player.cards;
}

function drawReceivedCards(cards) {
  if (cards.length == 0) return;
  spritesheet.then(sprites => {
    let imgs = cards.map(cardIndex).map(i => sprites[i]);

    let scale = 0.8;
    ctx.resetTransform();
    ctx.translate(canvas.width/2, canvas.height/2 - imgs[0].height * 0.25 * scale);
    ctx.translate(0, -imgs[0].height/2 * scale - 35);
    ctx.font = "24px Arial";
    ctx.textAlign = "center";

    let player = currentGame.players.find(p => p.id == playerId);
    let ranking = currentGame.previousRanking;
    let playerIndex = ranking.indexOf(player.id);
    let slaveId = ranking[ranking.length - (playerIndex + 1)];
    let slave = currentGame.players.find(p => p.id == slaveId);
    if (slave == undefined) {
      ctx.fillText("Recibiste las siguientes cartas:", 0, 0);
    } else {
      ctx.fillText("Recibiste de " + slave.name + ":", 0, 0);
    }
    ctx.resetTransform();
    ctx.translate(canvas.width/2, canvas.height/2 - imgs[0].height * 0.25);
    ctx.scale(scale, scale);

    if (imgs.length > 1) {
      ctx.translate(-imgs[0].width/2 - 10, 0);
    }

    imgs.forEach((card, i) => {
      drawCard(card);
      ctx.translate(card.width + 10, 0);
    });
  });
}

function draw(delta) {
  if (!currentGame) return;
  if (currentGame.state == "pending") {
    drawDeck();
  } else if (currentGame.state == "playing") {

    drawDiscarded(currentGame.discarded);

    let playerHand = getHand(getActivePlayers(currentGame).find(p => p.id == playerId));
    if (playerHand.length > 0) {
      drawHand(playerHand);
    }
  } else if (currentGame.state == "exchanging") {

    let playerHand = getHand(getActivePlayers(currentGame).find(p => p.id == playerId));
    if (currentGame.previousRanking[0] == playerId) {
      drawReceivedCards(playerHand.slice(-2));
      drawHand(playerHand.slice(0, -2));
    } else if (currentGame.previousRanking.length >= 4 &&
        currentGame.previousRanking[1] == playerId) {
      drawReceivedCards(playerHand.slice(-1));
      drawHand(playerHand.slice(0, -1));
    } else {
      drawHand(playerHand);
    }
  }

  scrollOffset += scrollAccel;
  scrollOffset %= 360;
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

function countUnique(iterable) {
  return new Set(iterable).size;
}

function isValidMove(selection) {
  if (countUnique(selection.map(c => c.number)) != 1) return false;
  if (currentGame.discarded.length == 0) return true;
  if (selection.length != currentGame.ncards) return false;

  let number = selection[0].number;
  let lastNumber = currentGame.discarded[currentGame.discarded.length-1].number;

  if (number == 1) { number = 13; }
  if (lastNumber == 1) { lastNumber = 13; }
  return number > lastNumber;
}

let previousRanking = {number: null, players: ""};

function updateUI() {
  $("#msg-board").html("");

  if (currentGame.number != previousRanking.number &&
      currentGame.previousRanking.join(",") != previousRanking.players) {
    previousRanking = {
      number: currentGame.number,
      players: currentGame.previousRanking.join(",") // NOTE(Richo): Turn into string for easier comparison
    };
    if (currentGame.players && currentGame.players.length > 0) {
      showRanking(currentGame.previousRanking.map(id => currentGame.players.find(p => p.id == id)));
    }
  }

  let $players = $("#players-table");
  $players.html("");
  $players.append($("<h5>").text("Jugadores:"));
  let currentPlayer = getCurrentPlayer();
  currentGame.players.forEach((player, i) => {
    let $name = $("<div>").text(player.name + (player.id == playerId ? " (yo)" : ""));

    let $row = $("<div>")
      .addClass("row")
      .append($("<div>")
        .addClass("col-6")
        .css("text-align", "right")
        .append($name));

    let currentRanking = currentGame.currentRanking || [];

    let playerHand = getHand(player);
    if (playerHand.length > 0 && currentRanking.length != currentGame.players.length) {
      let msg = playerHand.length == 1 ?
                  "1 carta" : playerHand.length + " cartas";
      $row.append($("<div>")
        .addClass("col-sm-auto")
        .text(msg));
    }

    if (currentRanking.findIndex(id => id == player.id) > -1) {
      $row.append($("<div>")
        .addClass("col-sm-auto")
        .append($star(currentRanking.findIndex(id => id == player.id) + 1)));
    } else if (player.id == currentGame.lastThrowPlayer) {
      $row.append($("<div>")
        .addClass("col-sm-auto")
        .append($("<i class='fas fa-hand-paper'></i>")));
    }

    if (currentPlayer && player.id == currentPlayer.id) {
      $row.addClass("turn");
      $name.prepend($("<i class='fas fa-arrow-right mr-3'></i>"));
    }

    $players.append($row);
  });

  if (currentGame.state == "playing") {
    $("#start-game-button").hide();
    $("#exchange-cards-button").hide();
    exchange = false;

    try {
      if (currentGame.lastMove != "") {
        $("#msg-board").append($("<h3>").text(currentGame.lastMove));
      }

      let currentPlayer = getCurrentPlayer();
      if (currentPlayer) {
        if (currentPlayer.id == playerId &&
            lastPlayer != currentPlayer.id) {
          playSound();
        }
        lastPlayer = currentPlayer.id;
      }
      if (currentPlayer && currentPlayer.id == playerId) {

        function getTurnMsg(ncards) {
          let msg = "";
          if (ncards) {
            msg = ncards == 1 ? "Tirá 1 carta" : "Tirá " + ncards + " cartas";
          } else {
            msg = "Elegí cuántas cartas tirar";
          }
          return msg;
        }

        $("#msg-board")
          .append($("<h4>").text("¡Es tu turno!"))
          .append($("<h4>").text(getTurnMsg(currentGame.ncards)));

        if (isValidMove(Array.from(selectedCards).map(i => currentPlayer.cards[i]))) {
          $("#throw-cards-button").attr("disabled", null);
          $("#throw-cards-button").show();
          //$("#select-all-button").show();
          $("#pass-turn-button").hide();

        } else {
          $("#throw-cards-button").attr("disabled", true);
          $("#throw-cards-button").hide();
          $("#pass-turn-button").show();
        }

        if (currentGame.discarded.length == 0) {
          $("#throw-cards-button").text(selectedCards.size == 1 ?
            "Tirar 1 carta" : "Tirar " + selectedCards.size + " cartas");

          /*
          NOTE(Richo): If we are choosing number of cards we always show the
          throw-cards button and hide the pass-turn button.
          */
          $("#throw-cards-button").show();
          $("#pass-turn-button").hide();
        } else {
          $("#throw-cards-button").text(currentGame.ncards == 1 ?
            "Tirar 1 carta" : "Tirar " + currentGame.ncards + " cartas");
        }

      } else {
        $("#throw-cards-button").hide();
        $("#pass-turn-button").hide();
      }

    } catch (err) {
      debugger;
    }
  } else if (currentGame.state == "pending") {
    $("#start-game-button").attr("disabled", true);

    if (currentGame.creator == playerId) {
      $("#start-game-button").show();
      if (currentGame.players.length > 1) {
        $("#start-game-button").attr("disabled", null);
      }
    } else {
      $("#start-game-button").hide();
    }
  } else if (currentGame.state == "exchanging") {

    $("#throw-cards-button").hide();
    $("#pass-turn-button").hide();

    if (!exchange && currentGame.previousRanking[0] == playerId) {
      $("#msg-board").append($("<h3>").text("Elegí 2 cartas para dar al esclavo"));
      $("#exchange-cards-button").text("Dar 2 cartas");
      $("#exchange-cards-button").show();
      if (selectedCards.size == 2) {
        $("#exchange-cards-button").attr("disabled", null);
      } else {
        $("#exchange-cards-button").attr("disabled", true);
      }
    } else if (!exchange && currentGame.previousRanking.length >= 4 && currentGame.previousRanking[1] == playerId) {
      $("#msg-board").append($("<h3>").text("Elegí 1 cartas para dar al esclavo"));
      $("#exchange-cards-button").text("Dar 1 carta");
      $("#exchange-cards-button").show();
      if (selectedCards.size == 1) {
        $("#exchange-cards-button").attr("disabled", null);
      } else {
        $("#exchange-cards-button").attr("disabled", true);
      }
    } else {
      $("#msg-board").append($("<h3>").text("Intercambiando cartas..."));
      $("#exchange-cards-button").hide();
    }
  }
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

function createDeck(nplayers) {
  let deck = [];
  let suits = ["oro", "copa", "espada", "basto"];
  // ACAACA
  let ndecks = nplayers == 1 ? 1 : 1;
  suits.forEach((suit, i) => {
    for (let i = 1; i <= 4; i++) {
      for (let j = 0; j < ndecks; j++) {
        deck.push({ number: i, suit: suit });
      }
    }
  });
  shuffle(deck);
  return deck;
}

function sortHandByCardValue(hand) {
  hand.sort((a, b) => {
    if (a.number == 1) return 1;
    if (b.number == 1) return -1;
    return a.number - b.number;
  });
}

function dealCards(deck, players) {
  let hands = players.map(each => []);
  let i = 0;
  while (deck.length > 0) {
    hands[i].push(deck.pop());
    i = (i + 1) % players.length;
  }
  return hands;
}

function exchangeCards1(hands) {
    let ranking = currentGame.previousRanking;
    let slaveId = ranking[ranking.length-1];
    let slaveIndex = currentGame.players.findIndex(p => p.id == slaveId);
    let masterId = ranking[0];
    let masterIndex = currentGame.players.findIndex(p => p.id == masterId);
    // The slave gives his two best cards to the master
    hands[masterIndex].push(hands[slaveIndex].pop());
    hands[masterIndex].push(hands[slaveIndex].pop());
}

function exchangeCards2(hands) {
    let ranking = currentGame.previousRanking;
    let slaveId = ranking[ranking.length-2];
    let slaveIndex = currentGame.players.findIndex(p => p.id == slaveId);
    let masterId = ranking[1];
    let masterIndex = currentGame.players.findIndex(p => p.id == masterId);
    // The slave gives his best card to the master
    hands[masterIndex].push(hands[slaveIndex].pop());
}

function startGame() {
  let deck = createDeck(currentGame.players.length);
  let hands = dealCards(deck, currentGame.players);

  // Sort each hand by card's value
  for (let i = 0; i < hands.length; i++) {
    sortHandByCardValue(hands[i]);
  }

  if (currentGame.previousRanking.length > 0) {
    exchangeCards1(hands);
    if (currentGame.previousRanking.length >= 4) {
      exchangeCards2(hands);
    }
  }

  // Sort each hand by card's value (again because of exchange)
  for (let i = 0; i < hands.length; i++) {
    sortHandByCardValue(hands[i]);
  }

  currentGame.players.forEach((player, i) => {
    db.collection(root).doc(currentGame.id).collection("players").doc(player.id).update({
      cards: hands[i]
    })
  });
}

function getActivePlayers(game) {
  if (!game.players) return [];
  let currentRanking = new Set(game.currentRanking || []);
  return game.players.filter(p => !currentRanking.has(p.id));
}

function showRanking(players) {
  return new Promise(resolve => {
    if (!players || players.length == 0) {
      resolve();
    } else {
      $("#ranking-list").html("");
      players.forEach(p => {
        $("#ranking-list").append($("<li>").text(p.name));
      });
      $("#ranking-modal").on("hide.bs.modal", function () {
        $("#ranking-modal").off("hide.bs.modal");
        resolve();
      });
      $("#ranking-modal").modal("show");
    }
  });
}

function joinGame(gameId, isPlaying) {
  $("#lobby").hide();

  let gameRef = db.collection(root).doc(gameId);

  gameRef.onSnapshot(snapshot => {
    let data = snapshot.data();
    data.id = snapshot.id;
    updateGame(data);
  });
  gameRef.collection("players").onSnapshot(snapshot => {
    let players = [];
    snapshot.forEach(doc => players.push(doc.data()));
    updatePlayers(players);
  });

  if (isPlaying) {
    $("#game").show();
    setTimeout(hideSpinner, 1000);
  } else {
    gameRef.update({
      playerIds: firebase.firestore.FieldValue.arrayUnion(playerId),
      playerNames: firebase.firestore.FieldValue.arrayUnion(userName)
    });
    gameRef.collection("players").doc(playerId).set({
      id: playerId,
      name: userName,
      //cards: []
    }, { merge: true }).then(doc => {
      $("#game").show();
      hideSpinner();
      updateUI();
    });
  }

  $("#start-game-button").on("click", function () {
    $("#start-game-button").hide();
    gameRef.update({
      turn: Math.floor(Math.random() * getActivePlayers(currentGame).length),
      state: "playing",
      passes: 0,
      lastMove: "",
      number: 0,
      previousRanking: [],
    }).then(startGame);
  });

  $("#select-all-button").on("click", function () {
    let player = currentGame.players.find(p => p.id == playerId);
    player.cards.forEach((c, i) => selectedCards.add(i));
    updateUI();
  })

  $("#exchange-cards-button").on("click", function () {
    exchange = true;
    let player = currentGame.players.find(p => p.id == playerId);
    let card_indices = Array.from(selectedCards).sort((a, b) => b - a); // DESC
    let sent_cards = card_indices.map(i => player.cards[i]);
    let ncards = selectedCards.size;

    let new_hand = Array.from(player.cards);
    card_indices.forEach(index => new_hand.splice(index, 1));

    selectedCards.clear();

    let playersCollection = db.collection(root).doc(currentGame.id).collection("players");

    let ranking = currentGame.previousRanking;
    let playerIndex = ranking.indexOf(playerId);
    let slave = null;
    if (playerIndex == 0) {
      slave = currentGame.players.find(p => p.id == ranking[ranking.length-1]);
    } else if (playerIndex == 1) {
      slave = currentGame.players.find(p => p.id == ranking[ranking.length-2]);
    } else {
      // ACAACA ERROR!
    }
    let slaveHand = slave.cards;
    sent_cards.forEach(c => slaveHand.push(c));
    sortHandByCardValue(slaveHand);


    playersCollection.doc(playerId).update({ // Update master's hand
      cards: new_hand
    }).then(() => {
      playersCollection.doc(slave.id).update({ // Update slave's hand
        cards: slaveHand
      }).then(() => { // Update game state only if all players have same number of cards
        let worstLoserId = ranking[ranking.length-1];
        let turn = currentGame.players.findIndex(p => p.id == worstLoserId);
        let interval = setInterval(function () {
          if (currentGame.state == "playing") {
            clearInterval(interval);
          } else if (new Set(currentGame.players.map(p => p.cards.length)).size == 1) {
            clearInterval(interval);
            gameRef.update({
              turn: turn,
              state: "playing",
              ncards: null
            });
          }
        }, 100);
      });
    });
  });

  $("#throw-cards-button").on("click", function () {
    $("#throw-cards-button").hide();
    $("#pass-turn-button").hide();

    let player = currentGame.players.find(p => p.id == playerId);
    let card_indices = Array.from(selectedCards).sort((a, b) => b - a); // DESC
    let discarded_cards = currentGame.discarded.concat(card_indices.map(i => player.cards[i]));
    let ncards = selectedCards.size;

    let new_hand = Array.from(player.cards);
    card_indices.forEach(index => new_hand.splice(index, 1));

    selectedCards.clear();

    if (new_hand.length == 0) {
      // Throwing last card
      let activePlayers = getActivePlayers(currentGame);
      if (activePlayers.length == 2) {
        // NO players left - end of game!
        let currentRanking = (currentGame.currentRanking || []).concat(playerId);
        let loser = activePlayers.find(p => p.id != playerId);
        currentRanking.push(loser.id);
        gameRef.update({
          discarded: discarded_cards,
          ncards: ncards,
          passes: 0,
          lastMove: userName + " tiró " + ncards + (ncards == 1 ? " carta" : " cartas"),
          currentRanking: currentRanking,
          lastThrowPlayer: playerId
        }).then(() => {
          setTimeout(() => {
            gameRef.update({
              discarded: [],
              previousRanking: currentRanking,
              currentRanking: [],
              state: "exchanging",
              turn: -1,
              passes: 0,
              lastMove: "",
              lastThrowPlayer: null,
              number: (currentGame.number || 0) + 1,
              ncards: null,
            }).then(startGame);
          }, 250);
        });
      } else {
        // Game should continue without current player
        gameRef.update({
          discarded: discarded_cards,
          ncards: ncards,
          passes: 0,
          lastMove: userName + " tiró " + ncards + (ncards == 1 ? " carta" : " cartas"),
          currentRanking: (currentGame.currentRanking || []).concat(playerId),
          turn: -1
        }).then(() => {
          setTimeout(() => {
            let turn = currentGame.players.findIndex(p => p.id == playerId);
            do {
              turn = (turn + 1) % currentGame.players.length;
            } while (currentGame.currentRanking.findIndex(id => id == currentGame.players[turn].id) >= 0);
            let nextPlayer = currentGame.players[turn];
            turn = getActivePlayers(currentGame).findIndex(p => p.id == nextPlayer.id);
            gameRef.update({
              turn: turn
            });
          }, 100);
        });
      }
    } else if (discarded_cards[discarded_cards.length-1].number == 1) {
      // Throwing a 1
      gameRef.update({
        turn: -1,
        discarded: discarded_cards,
        ncards: ncards,
        passes: 0,
        lastMove: userName + " tiró " + ncards + (ncards == 1 ? " carta" : " cartas"),
        lastThrowPlayer: playerId
      }).then(() => {
        setTimeout(() => {
          gameRef.update({
            turn: getActivePlayers(currentGame).findIndex(p => p.id == playerId),
            discarded: [],
            ncards: null,
            //lastThrowPlayer: null
          })
        }, 500);
      });
    } else {
      // Regular throw
      gameRef.update({
        turn: (currentGame.turn + 1) % getActivePlayers(currentGame).length,
        discarded: discarded_cards,
        ncards: ncards,
        passes: 0,
        lastMove: userName + " tiró " + ncards + (ncards == 1 ? " carta" : " cartas"),
        lastThrowPlayer: playerId
      });
    }

    db.collection(root).doc(currentGame.id).collection("players").doc(playerId).update({
      cards: new_hand
    });
  });

  $("#pass-turn-button").on("click", function () {
    $("#throw-cards-button").hide();
    $("#pass-turn-button").hide();

    selectedCards.clear();
    if (currentGame.passes + 1 == getActivePlayers(currentGame).length) {
      // All players have passed
      gameRef.update({
        turn: -1,
        passes: currentGame.passes + 1,
        lastMove: userName + " pasó"
      }).then(() => {

        let turn = currentGame.players.findIndex(p => p.id == currentGame.lastThrowPlayer);
        while (currentGame.currentRanking.findIndex(id => id == currentGame.players[turn].id) >= 0) {
          turn = (turn + 1) % currentGame.players.length;
        }
        let nextPlayer = currentGame.players[turn];
        turn = getActivePlayers(currentGame).findIndex(p => p.id == nextPlayer.id);

        gameRef.update({
          turn: turn,
          discarded: [],
          ncards: null,
        });
      });
    } else {
      // NORMAL pass
      gameRef.update({
        turn: (currentGame.turn + 1) % getActivePlayers(currentGame).length,
        passes: currentGame.passes + 1,
        lastMove: userName + " pasó"
      }).then(updateUI);
    }
  });

  $("#game-id").text("Código: " + gameId);
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
  let scrolling = false;
  let scrollMin = 10;
  let last = 0;

  canvas.addEventListener("touchstart", function (e) {
    scrollBegin = getTouchPos(canvas, e);
  }, false);
  canvas.addEventListener("touchend", function (e) {
    scrollEnd = getTouchPos(canvas, e);
    if (scrollBegin != null && dist(scrollBegin, scrollEnd) > scrollMin) {
      scroll(scrollBegin, scrollEnd);
    } else if (!scrolling) {
      click(scrollEnd);
    }
    scrollBegin = null;
    scrollEnd = null;
    scrolling = false;
  }, false);
  canvas.addEventListener("touchmove", function (e) {
    scrollEnd = getTouchPos(canvas, e);
    let now = +new Date();
    if (scrollBegin != null && dist(scrollBegin, scrollEnd) > scrollMin && now - last > 16) {
      last = now;
      scrolling = true;
      scroll(scrollBegin, scrollEnd);
      scrollBegin = scrollEnd;
    }
  }, false);

  canvas.addEventListener("mousedown", function (e) {
    scrollBegin = getMousePos(canvas, e);
  }, false);
  canvas.addEventListener("mouseup", function (e) {
    scrollEnd = getMousePos(canvas, e);
    if (scrollBegin != null && dist(scrollBegin, scrollEnd) > scrollMin) {
      scroll(scrollBegin, scrollEnd);
    } else if (!scrolling) {
      click(scrollEnd);
    }
    scrollBegin = null;
    scrollEnd = null;
    scrolling = false;
  }, false);
  canvas.addEventListener("mousemove", function (e) {
    scrollEnd = getMousePos(canvas, e);
    let now = +new Date();
    if (scrollBegin != null && dist(scrollBegin, scrollEnd) > scrollMin && now - last > 16) {
      last = now;
      scrolling = true;
      scroll(scrollBegin, scrollEnd);
      scrollBegin = scrollEnd;
    }
  }, false);
  canvas.addEventListener("mouseout", function (e) {
    scrolling = false;
    scrollBegin = null;
    scrollEnd = null;
  }, false);

}

function initializeCanvas() {
  canvas = document.getElementById("world");
  ctx = canvas.getContext("2d");

  initializeCanvasEvents();
  resizeCanvas();
  $(window).resize(resizeCanvas);

  let last = 0;
  function privateDraw() {
    let now = +new Date();
    let delta = (now - last) / 1000;
    if (delta > 0.01) {
      ctx.resetTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(delta);
      last = now;
    }
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

function showSpinner(msg) {
  $("#spinner-modal-msg").text(msg);
  $("#spinner-modal").modal("show");
}

function hideSpinner() {
  $("#spinner-modal").modal("hide");
}

function showAlert(msg, time) {
  return new Promise(resolve => {
    $("#alert-modal-msg").text(msg);
    $("#alert-modal").modal("show");
    setTimeout(() => {
      $("#spinner-modal").modal("hide");
      resolve();
    }, time || 1000);
  });
}

function initializeLobby() {
  db.collection(root).onSnapshot(snapshot => {
    let $tbody = $("#games-table tbody");
    $tbody.html("");
    let games = [];
    snapshot.forEach((doc, i) => {
      let data = doc.data();
      data.id = doc.id;
      games.push(data);
    });
    games.sort((a, b) => a.timestamp < b.timestamp ? 1 : -1);
    games.forEach(game => {
      let $row = $("<tr>")
        .append($("<td>").text(game.id))
        .append($("<td>").text(displayState(game.state)))
        .append($("<td>").text(game.playerNames.join(", ")));
      if (game.playerIds && game.playerIds.indexOf(playerId) >= 0) {
        $row.css("color", "blue");
      }
      let $btn = $("<button>")
        .addClass("btn").addClass("btn-sm").addClass("btn-outline-info")
        .text("Entrar")
        .on("click", () => {
          showSpinner("Entrando al juego...");
          joinGame(game.id, game.state == "playing");
        });
      $row.append($("<td>").append($btn));
      $tbody.append($row);
    });
  });

  $("#new-game-button").on("click", function () {
    showSpinner("Creando juego...");
    $("#lobby").remove();
    db.collection(root).add({
      timestamp: new Date(),
      state: "pending",
      playerNames: [],
      discarded: [],
      currentRanking: [],
      creator: playerId
    }).then(doc => joinGame(doc.id, false));
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
  spritesheet = loadSpritesheet("esclava/cards.png", 208, 319, 50);
}

function initializePlayerId() {
  playerId = localStorage.getItem("player-id");
  if (playerId == undefined) {
    playerId = uuid();
    localStorage.setItem("player-id", playerId);
  }

  // MICA 47613316-c920-45e6-b7a0-609fa67ba553
  if (playerId == "47613316-c920-45e6-b7a0-609fa67ba553") {
    //startFireworks();
  }
}

function playSound() {
  new Audio('sounds/success.wav').play();
}

$(document).ready(function () {
  initializePlayerId();
  initializeCanvas();
  initializeLobby();
  initializeSpritesheet();
  askUserName();
});
