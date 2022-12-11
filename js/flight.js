const map = L.map('map');
const allMarkers = [];
let currentAirport = null;
let currentPlayer = null;
const flightPath = [];
const playerFlightPath = [];

Number.prototype.formatNumbers = function(e) {
  return this.toLocaleString('ja-JP', {style: 'currency', currency: 'JPY'}).
      slice(1);
};

async function fetchJson(url, param={}) {
  const fetchResponse = await fetch(url, param)
  const jsonData = await fetchResponse.json()
  return jsonData
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function nextRoundButton() {
  return new Promise(resolve => {
    const button = document.querySelector(".choiceButtons #skip")
    button.onclick = resolve
  });
}

async function airportByIsocode(airportCountry) {
  const jsonAnswer = await fetchJson(`http://127.0.0.1:3000/code/${airportCountry}`);
  currentAirport = jsonAnswer;
  updateMap({
    longitude_deg: jsonAnswer[4],
    latitude_deg: jsonAnswer[3],
    name: jsonAnswer[1],
  });
  return jsonAnswer;
}
// Turha
async function enterStartingCountry() {
  const startIsoCode = prompt('Enter the starting country code:');
  if (startIsoCode.length == 0) return 'random';
  const isoResultJson = await fetchJson(
      `http://127.0.0.1:3000/tarkista-maakoodi/${startIsoCode}`,
  );
  if (isoResultJson.result == false) {
    const again = confirm(
        'Isocode is not right, do you want to type a new one?',
    );
    if (again == true) {
      return enterStartingCountry();
    }
  }
  return startIsoCode;
}

async function addPlayer(playerName, startIsoCode) {
  document.querySelector("#game").style.visibility = null
  document.querySelector("#mainMenu").style.display = "none"
  document.querySelector("dialog").close();
  const airportData = await airportByIsocode(startIsoCode);
  const playerJson = await fetchJson('http://127.0.0.1:3000/newplayer', {
    method: 'POST',
    body: JSON.stringify({airport: airportData, playerName: playerName}),
  });
  flightPath.push([airportData]);
  playerFlightPath.push(airportData.slice(3, 5));
  currentPlayer = playerJson;
  getNewAirports(6);
  updatePlayerInterface(currentPlayer);
}

async function getNewAirports(numb) {
  const airportResponseJson = await fetchJson(`http://127.0.0.1:3000/airport/${numb}`);
  const buttons = document.querySelectorAll('.buttons tr.button');
  flightPath.push(airportResponseJson);

  airportResponseJson.forEach((airport, index) => {
    const button = buttons[index];
    button.onmouseleave = null;
    button.onmouseover = null;
    button.querySelector("td.country").textContent = `${airport[0]}`;
    button.querySelector("td.airport").textContent = airport[1];

    document.querySelector("#skip").classList.add("disabled");
    document.querySelector("#newGameButton").classList.add("disabled");
    document.querySelector("#scoreboardButton").classList.add("disabled");
    button.onclick = async () => {
      const calculateJson = await fetchJson(
          `http://127.0.0.1:3000/laske-lennon-tiedot`,
          {
            method: 'POST',
            body: JSON.stringify({
              alkuLentokentta: currentAirport,
              loppuLentokentta: airport,
            }),
          },
      );
      showAllMapResults(airportResponseJson, airport);
      playerFlightPath.push(airport.slice(3, 5));
      buttons.forEach(button => button.onclick = null);
      document.querySelector('.buttons').classList.add("disabled");
      button.classList.add("selected");

      await postPlayerFlight(airport, calculateJson)
      updatePlayerInterface(currentPlayer);
      await nextRoundButton();

      button.classList.remove("selected");
      if(currentPlayer.co2 >= currentPlayer.co2max) endGame();
      else {
        getNewAirports(numb);
        document.querySelector('.buttons').classList.remove("disabled");
        updateMap({
          longitude_deg: airport[4],
          latitude_deg: airport[3],
          name: airport[1],
        });
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

async function saveGame(){
  const {id} = await fetchJson(`http://127.0.0.1:3000/save`, {
    method: 'POST',
    body: JSON.stringify(currentPlayer)
  });
  
  return id;
}

async function endGame(){
  const playerId = await saveGame();
  // const startAgain = confirm("haluatko aloittaa uuden pelin?")
  renderPaths(playerFlightPath);
  document.querySelector("#skip").classList.add("disabled");
  document.querySelector("#reset").classList.add("disabled");
  document.querySelector("#newGameButton").classList.remove("disabled");
  document.querySelector("#scoreboardButton").classList.remove("disabled");
  // if(startAgain) addPlayer();
  // else scoreboardById(playerId)
}

async function getBestPath() {
  const flightPaths = flightPath.map(row => row.map(airport => {
    return airport.slice(3, 6)
  }));

  const bestPath = await fetchJson("http://127.0.0.1:3000/best-flight-path", {
    method: 'POST',
    body: JSON.stringify({
      flightPaths
    })
  });


  const arr = bestPath.flightPaths.map(path => path[0].slice(0, 2))
  console.log(arr)

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

async function scoreBoard() {
  const scoreboardJson = await fetchJson(`http://127.0.0.1:3000/scoreboard/`)
  console.log(scoreboardJson)
  const tbodySelect = document.querySelector("#scoreboard tbody")
  scoreboardJson.forEach(row => {
    const tableRow = document.createElement("tr")
    row.forEach(value => {
      const column = document.createElement("td")
      column.textContent = value
      tableRow.append(column)
    })
    tbodySelect.append(tableRow)
  })
  document.querySelector("#scoreboard").style.display=null
  document.querySelector("#game").style.display="none"
}

async function scoreboardById(id) {
  const {playerList, startIndex} = await fetchJson(`http://127.0.0.1:3000/scoreboard/${id}`)
  console.log(playerList)
  const tbodySelect = document.querySelector("#scoreboard tbody")
  playerList.forEach((row, index) => {
    const tableRow = document.createElement("tr")
    if (row[0] == id) {
      tableRow.classList.add("selected")
    }
    row[0] = startIndex + index
    row.forEach(value => {
      const column = document.createElement("td")
      column.textContent = value
      tableRow.append(column)
    })
    tbodySelect.append(tableRow)
  })
  document.querySelector("#scoreboard").style.display=null
  document.querySelector("#game").style.display="none"
}

function updatePlayerInterface(player) {
  document.querySelector("#player .text").textContent = player.nimi;
  document.querySelector("#score .text").textContent = player.score;
  const scoreText = `${player.co2.formatNumbers()} / ${player.co2max.formatNumbers()}`;
  document.querySelector("#totalCo2 .text").textContent = scoreText;
  document.querySelector("#airport .text").textContent = `[${player.airport[0]}] ${player.airport[1]}`;
  
  document.querySelector("#skip").classList.remove("disabled");
}

function updateMap(jsonAnswer) {
  removeAllMarkers();
  const longitude_deg = jsonAnswer.longitude_deg;
  const latitude_deg = jsonAnswer.latitude_deg;
  const iconElement = createMarkerElement("default");
  const icon = L.divIcon({html: iconElement});
  map.setView([latitude_deg, longitude_deg], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  const marker = L.marker([latitude_deg, longitude_deg], {icon: icon}).
      addTo(map).
      bindPopup(jsonAnswer.name).
      openPopup();
  allMarkers.push(marker);
}

function removeAllMarkers() {
  allMarkers.forEach((marker) => map.removeLayer(marker));
  allMarkers.length = 0;
}

document.querySelector("form").addEventListener("submit", async function(submitEvent) {
  submitEvent.preventDefault();
  const formData = new FormData(this);
  const errorElem = document.querySelector("form .error");
  const startIsocode = formData.get("startIsocode");

  if(startIsocode == "" || !errorElem.classList.contains("hidden")) {
    addPlayer(formData.get("playerName"), "random");
  } else {
    const {result} = await fetchJson(`http://127.0.0.1:3000/tarkista-maakoodi/${startIsocode}`)
    if(result) return addPlayer(formData.get("playerName"), startIsocode);

    errorElem.classList.remove("hidden");
    document.querySelector(`form input[type="submit"]`).value = "Start anyway"
  }
});


const reset = document.querySelector(".choiceButtons #reset")
reset.onclick = async () => {
  await fetch(`http://127.0.0.1:3000/reset-score/${currentPlayer.id}`)
  const startIsoCode = await enterStartingCountry()
  const airport = await airportByIsocode(startIsoCode)
  currentPlayer = await fetchJson('http://127.0.0.1:3000/newplayer', {
    method: 'POST',
    body: JSON.stringify({airport, playerName: currentPlayer.nimi}),
  });
  updatePlayerInterface(currentPlayer);
  getNewAirports(6)
}

const b = document.createElement("button");
b.id = "nappi"
b.textContent = "aloita uusi peli"
b.onclick = async () => {
  document.querySelector("#mainMenu").style.display = "block"
  document.querySelector("#scoreboard").style.visibility = "hidden"

  addPlayer()
}
document.querySelector("#scoreboard").append(b)


const mainMenuButton = document.querySelector(".startGame")
mainMenuButton.onclick = async () => {
  document.querySelector("dialog").showModal();
}





// Debugging

window.addEventListener("keydown",e => {
  // console.log(e)
  if(e.code == "BracketLeft") {
    console.log()
    document.querySelector(".startGame").click();
    document.querySelector(`input[name="playerName"]`).value = "kassu"
    document.querySelector(`input[name="startIsocode"]`).value = "fi"
    document.querySelector(`input[type="submit"]`).click();
  }
})