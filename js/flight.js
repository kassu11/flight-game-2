const map = L.map('map');
const allMarkers = [];
const flightPath = [];
const playerFlightPath = [];

let currentAirport = null;
let currentPlayer = null;

const skipButton = document.querySelector("#skip");
const resetButton = document.querySelector("#reset");

const gameContainer = document.querySelector("#game");
const mainMenuContainer = document.querySelector("#mainMenu");

const dialog = document.querySelector("dialog");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

Number.prototype.formatNumbers = function(e) {
  return this.toLocaleString('ja-JP', {
    style: 'currency', 
    currency: 'JPY'
  }).slice(1);
};

async function fetchJson(url, param = {}) {
  const fetchResponse = await fetch(url, param)
  const jsonData = await fetchResponse.json()
  return jsonData
}

const nextRoundButtonClicked = () => new Promise(resolve => skipButton.onclick = resolve);

async function airportByIsocode(airportIsocode) {
  const jsonAnswer = await fetchJson(`http://127.0.0.1:3000/code/${airportIsocode}`);
  currentAirport = jsonAnswer;
  return jsonAnswer;
}

async function addPlayer(playerName, startIsoCode) {
  gameContainer.style.visibility = null
  gameContainer.style.overflow = null
  mainMenuContainer.style.display = "none"
  dialog.close();
  resetButton.classList.remove("disabled");

  const airportData = await airportByIsocode(startIsoCode);
  updateMap(airportData);

  const playerJson = await fetchJson('http://127.0.0.1:3000/newplayer', {
    method: 'POST',
    body: JSON.stringify({airport: airportData, playerName: playerName}),
  });

  flightPath.length = 0
  playerFlightPath.length = 0
  flightPath.push([airportData]);
  playerFlightPath.push(airportData.slice(3, 5));

  currentPlayer = playerJson;

  getNewAirports(6);
  updatePlayerInterface(currentPlayer);
}

async function getNewAirports(numb) {
  const airportResponseJson = await fetchJson(`http://127.0.0.1:3000/airport/${numb}`);
  const buttons = document.querySelectorAll('.buttons tr.button');
  document.querySelector('.buttons').classList.remove("disabled");
  document.querySelector('.buttons .selected')?.classList.remove("selected");
  flightPath.push(airportResponseJson);

  airportResponseJson.forEach(async (airport, index) => {
    const button = buttons[index];
    button.onmouseleave = null;
    button.onmouseover = null;
    button.querySelector("td.country").textContent = `${airport[0]}`;
    button.querySelector("td.airport").textContent = airport[1];

    const calculateJson = await fetchJson(
      `http://127.0.0.1:3000/laske-lennon-tiedot`, {
        method: 'POST',
        body: JSON.stringify({
          alkuLentokentta: currentAirport,
          loppuLentokentta: airport,
        }),
      },
    );

    button.querySelector("td .distance").textContent = `${calculateJson.matka} km`;
    button.querySelector("td .score").textContent = `${calculateJson.score} p`;
    button.querySelector("td .type .text").textContent = airport[5];

    console.log(airport);

    skipButton.classList.add("disabled");
    document.querySelector("#newGameButton").classList.add("disabled");
    document.querySelector("#scoreboardButton").classList.add("disabled");
    button.onclick = async () => {
      showAllMapResults(airportResponseJson, airport);
      playerFlightPath.push(airport.slice(3, 5));
      buttons.forEach(button => button.onclick = null);
      document.querySelector('.buttons').classList.add("disabled");
      button.classList.add("selected");

      await postPlayerFlight(airport, calculateJson)
      updatePlayerInterface(currentPlayer);
      await nextRoundButtonClicked();

      button.classList.remove("selected");
      if(currentPlayer.co2 >= currentPlayer.co2max) endGame();
      else {
        getNewAirports(numb);
        updateMap(airport);
      }
    };
  });
}

async function postPlayerFlight(airport, stats) {
  const playerJson = await fetchJson(`http://127.0.0.1:3000/matkusta`, {
    method: 'POST',
    body: JSON.stringify({
      matka: stats.matka,
      score: stats.score,
      co2: stats.co2,
      playerId: currentPlayer.id,
      airport,
    }),
  });

  currentPlayer = playerJson;
  currentAirport = airport;
}

function showAllMapResults(airportSelection, selectedAirport) {
  const allAirPorts = [...airportSelection, currentAirport]
  const arrayOfMarkers = allAirPorts.map(airport => {
    return [airport[3], airport[4]]
  });

  removeAllMarkers();

  const bounds = new L.LatLngBounds(arrayOfMarkers);
  map.fitBounds(bounds, {padding: [25, 25]});
  const startPoint = new L.LatLng(currentAirport[3], currentAirport[4]);

  
  allAirPorts.forEach((airport, index) => {
    const longitude_deg = airport[4]
    const latitude_deg = airport[3]
    const endPoint = new L.LatLng(airport[3], airport[4]);
    const isSelected = selectedAirport === airport;

    const markerElem = createMarkerElement(
      isSelected ? "current" : 
      airport == currentAirport ? "headed" : "default");
    const icon = L.divIcon({html: markerElem});

    if(index < airport.length) {
      const button = document.querySelectorAll("#game .buttons .button")[index]
      button.onmouseover = () => {
        markerElem.classList.add("hovered")
      }
      button.onmouseleave = () => {
        markerElem.classList.remove("hovered")
      }
    }

    

    const firstpolyline = new L.Polyline([startPoint, endPoint], {
      color: isSelected ? "#22d3ee" : "#164e63",
      weight: isSelected ? 3 : 2,
      opacity: isSelected ? 1 : .5,
      smoothFactor: 1
    });
    allMarkers.push(firstpolyline)
    firstpolyline.addTo(map);
  
    const marker = L.marker([latitude_deg, longitude_deg], {icon: icon}).addTo(map);
    allMarkers.push(marker);
  });
}

async function savePlayerData() {
  const {id} = await fetchJson(`http://127.0.0.1:3000/save`, {
    method: 'POST',
    body: JSON.stringify(currentPlayer)
  });
  
  return id;
}

async function endGame(){
  const savedPlayerId = await savePlayerData();

  renderPaths(playerFlightPath);
  skipButton.classList.add("disabled");
  resetButton.classList.add("disabled");
  document.querySelector("#newGameButton").classList.remove("disabled");
  document.querySelector("#scoreboardButton").classList.remove("disabled");

  document.querySelector("#scoreboardButton").onclick = () => {
    showScoreboardById(savedPlayerId)
  }
}

async function getBestPath() {
  const flightPaths = flightPath.map(row => row.map(airport => {
    return airport.slice(3, 6)
  }));

  const bestPath = await fetchJson("http://127.0.0.1:3000/best-flight-path", {
    method: 'POST',
    body: JSON.stringify({flightPaths})
  });

  const arr = bestPath.flightPaths.map(path => path[0].slice(0, 2))

  renderPaths(arr);
}

function createMarkerElement(type) {
  const div = document.createElement("div");
  if(type === "default") div.classList.add("normalMarker")
  else if(type === "current") div.classList.add("normalMarker", "current")
  else if(type === "headed") div.classList.add("normalMarker", "headed")
  else if(type === "dot") {
    div.classList.add("dotMarker")
    const p = document.createElement("p");
    div.append(p);
  }
  
  return div;
}

function renderPaths(path) {
  removeAllMarkers();
  const bounds = new L.LatLngBounds(path);
  map.fitBounds(bounds, {padding: [25, 25]});

  for(let i = 0; i < path.length; i++) {
    const [lati, long] = path[i]
    const markerElem = createMarkerElement("dot");
    markerElem.style.background = `hsl(${10 * i % 360}deg 100% 50%)`;
    markerElem.querySelector("p").textContent = i;
    const iconOption = {html: i == 0 ? createMarkerElement("default") : markerElem}
    const icon = L.divIcon(iconOption);
    const marker = L.marker([lati,  long], {icon: icon}).addTo(map);
    allMarkers.push(marker);
  }


  let startCords = path[0]
  for(let i = 1; i < path.length; i++) {
    const endCords = path[i];
    const startPoint = new L.LatLng(startCords[0], startCords[1]);
    const endPoint = new L.LatLng(endCords[0], endCords[1]);
    startCords = endCords;
    const firstpolyline = new L.Polyline([startPoint, endPoint], {
      color: `hsl(${10 * i % 360}deg 100% 50%)`,
      weight: true ? 3 : 2,
      opacity: true ? 1 : .5,
      smoothFactor: 1
    });
    allMarkers.push(firstpolyline)
    firstpolyline.addTo(map);
  }
}

async function showScoreboard() {
  const scoreboardJson = await fetchJson(`http://127.0.0.1:3000/scoreboard/`)
  const tbodySelect = document.querySelector("#scoreboard tbody");
  tbodySelect.textContent = "";

  scoreboardJson.forEach((row, index) => {
    const tableRow = document.createElement("tr")

    row[0] = index + 1
    row.forEach(value => {
      const column = document.createElement("td")
      column.textContent = value
      tableRow.append(column)
    });
    tbodySelect.append(tableRow)
  })
  document.querySelector("#scoreboard").style.display = null
  gameContainer.style.display = "none"
}

async function showScoreboardById(id) {
  const {playerList, startIndex} = await fetchJson(`http://127.0.0.1:3000/scoreboard/${id}`)
  let scrollTarget = null;

  const tbodySelect = document.querySelector("#scoreboard tbody")
  tbodySelect.textContent = "";
  playerList.forEach((row, index) => {
    const tableRow = document.createElement("tr")
    if (row[0] == id) {
      tableRow.classList.add("selected")
      scrollTarget = tableRow
    }
    row[0] = startIndex + index
    row.forEach(value => {
      const column = document.createElement("td")
      column.textContent = value
      tableRow.append(column)
    })
    tbodySelect.append(tableRow)
  });

  document.querySelector("#scoreboard").style.display = null
  gameContainer.style.display = "none"
  scrollTarget.scrollIntoView({behavior: "smooth", block: "center"})
}

function updatePlayerInterface(player) {
  document.querySelector("#player .text").textContent = player.nimi;
  document.querySelector("#score .text").textContent = player.score;
  const scoreText = `${player.co2.formatNumbers()} / ${player.co2max.formatNumbers()}`;
  document.querySelector("#totalCo2 .text").textContent = scoreText;
  document.querySelector("#airport .text").textContent = `[${player.airport[0]}] ${player.airport[1]}`;
  
  skipButton.classList.remove("disabled");
}

function updateMap(airportData) {
  removeAllMarkers();

  const longitude_deg = airportData[4];
  const latitude_deg = airportData[3];
  const airportName = airportData[1];

  const iconElement = createMarkerElement("default");
  const icon = L.divIcon({html: iconElement});
  map.setView([latitude_deg, longitude_deg], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  const marker = L.marker([latitude_deg, longitude_deg], {icon: icon})
    .addTo(map)
    .bindPopup(airportName)
    .openPopup();
  allMarkers.push(marker);
}

function removeAllMarkers() {
  allMarkers.forEach((marker) => map.removeLayer(marker));
  allMarkers.length = 0;
}

function openGameStartingModel() {
  if(!dialog.open) dialog.showModal();
  dialog.querySelector("form").reset();
  dialog.querySelector("form input[name='playerName']").disabled = false;
  dialog.querySelector("form .error").classList.add("hidden");
  document.querySelector(`form input[type="submit"]`).value = "Start game"
}

document.querySelector("form").addEventListener("submit", newGameFormSubmit);
async function newGameFormSubmit(submitEvent) {
  submitEvent.preventDefault();
  document.querySelector("form input[name='playerName']").disabled = false;
  const formData = new FormData(this);
  const errorElem = document.querySelector("form .error");
  const startIsocode = formData.get("startIsocode");

  if(startIsocode == "" || !errorElem.classList.contains("hidden")) {
    addPlayer(formData.get("playerName"), "random");
    newGameFormSubmit.resolve?.();
  } else {
    const {result} = await fetchJson(`http://127.0.0.1:3000/tarkista-maakoodi/${startIsocode}`)
    if(result) {
      newGameFormSubmit.resolve?.();
      return addPlayer(formData.get("playerName"), startIsocode);
    }

    errorElem.classList.remove("hidden");
    document.querySelector(`form input[type="submit"]`).value = "Start anyway"
  }
}

resetButton.onclick = async function() {
  if(this.classList.contains("disabled")) return;
  openGameStartingModel();
  const formElem = document.querySelector("form");
  formElem.querySelector("input[name='startIsocode']").focus();
  formElem.querySelector("input[name='startIsocode']").select();
  const playerNameInput = formElem.querySelector("input[name='playerName']");
  const {nimi, id} = currentPlayer;
  playerNameInput.value = nimi
  playerNameInput.disabled = true;

  const formResponse = new Promise(resolve => newGameFormSubmit.resolve = resolve);
  await formResponse;
  await fetch(`http://127.0.0.1:3000/reset-score/${id}`)
}
document.querySelector("#newGameButton").onclick = async function() {
  if(this.classList.contains("disabled")) return;
  openGameStartingModel();
  document.querySelector("form input[name='playerName']").focus();
  document.querySelector("form input[name='playerName']").select();
}

document.querySelector("#backToMainMenu").addEventListener("click", () => {
  document.querySelector("#scoreboard").style.display = "none"
  gameContainer.style.visibility = "hidden"
  gameContainer.style.overflow = "scroll"
  gameContainer.style.display = null
  mainMenuContainer.style.display = null
});

document.querySelector("#scoreBoardNewGame").addEventListener("click", async () => {
  openGameStartingModel();
  const formResponse = new Promise(resolve => newGameFormSubmit.resolve = resolve);
  await formResponse;
  document.querySelector("#scoreboard").style.display = "none";
  gameContainer.style.visibility = null;
  gameContainer.style.overflow = null;
  gameContainer.style.display = null;
});

document.querySelector("#startGame").addEventListener("click", openGameStartingModel);

document.querySelector("#showScoreboard").addEventListener("click", e => {
  showScoreboard();
  document.querySelector("#scoreboard").style.display = null;
  mainMenuContainer.style.display = "none";
});





const DEBUG = false;

window.addEventListener("keydown", e => {
  if(!DEBUG) return;
  if(e.code == "BracketLeft") {
    document.querySelector("#startGame").click();
    document.querySelector(`input[name="playerName"]`).value = "kassu"
    document.querySelector(`input[name="startIsocode"]`).value = "fi"
    document.querySelector(`input[type="submit"]`).click();
  }
})
