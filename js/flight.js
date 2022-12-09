const map = L.map('map');
const allMarkers = [];
let currentAirport = null;
let currentPlayer = null;
const flightPath = [];

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

async function addPlayer() {
  const playerName = prompt('Enter your name :');
  const startIsoCode = await enterStartingCountry();
  const airportData = await airportByIsocode(startIsoCode);

  const playerJson = await fetchJson('http://127.0.0.1:3000/newplayer', {
    method: 'POST',
    body: JSON.stringify({airport: airportData, playerName: playerName}),
  });
  flightPath.push([airportData])
  console.log(playerJson);
  currentPlayer = playerJson;
  getNewAirports(6);
}

async function getNewAirports(numb) {
  const airportResponseJson = await fetchJson(`http://127.0.0.1:3000/airport/${numb}`);
  const buttons = document.querySelectorAll('.buttons tr.button');
  flightPath.push(airportResponseJson);

  console.log("getNewAirports")

  console.log(flightPath)
  airportResponseJson.forEach((airport, index) => {
    const button = buttons[index];
    button.querySelector("td.country").textContent = `${airport[0]}`;
    button.querySelector("td.airport").textContent = airport[1];
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

      buttons.forEach(button => button.onclick = null);
      document.querySelector('.buttons').classList.add("disabled");
      button.classList.add("selected");

      await postPlayerFlight(airport, calculateJson)
      updatePlayerInterface(currentPlayer);
      await sleep(2500);

      document.querySelector('.buttons').classList.remove("disabled");
      button.classList.remove("selected");
    
      removeAllMarkers();
      updateMap({
        longitude_deg: airport[4],
        latitude_deg: airport[3],
        name: airport[1],
      });
      if(currentPlayer.co2 >= currentPlayer.co2max) endGame();
      else getNewAirports(numb);
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

  
  allAirPorts.forEach(airport => {
    const longitude_deg = airport[4]
    const latitude_deg = airport[3]
    const endPoint = new L.LatLng(airport[3], airport[4]);
    let className = "customMarker";
    if(airport == selectedAirport) className += " headed";
    else if(airport == currentAirport) className += " current";
    const icon = L.divIcon({className});
    
    const isSelected = selectedAirport === airport;

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
  const startAgain = confirm("haluatko aloittaa uuden pelin?")
  const bestPath = fetchJson("http://127.0.0.1:3000/best-flight-path", {
    flightPaths: flightPath.map(row => row.map(airport => {
      return airport.slice(3, 6)
    }))
  })
  if(startAgain) addPlayer();
  else scoreboardById(playerId)
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
  document.querySelector('#player .text').textContent = player.nimi;
  document.querySelector('#score .text').textContent = player.score;
  document.querySelector(
      '#totalCo2 .text').textContent = `${player.co2.formatNumbers()} / 
                    ${player.co2max.formatNumbers()}`;
  document.querySelector(
      '#airport .text').textContent = `[${player.airport[0]}] ${player.airport[1]}`;
  console.log(player.airport);
}

function updateMap(jsonAnswer) {
  const longitude_deg = jsonAnswer.longitude_deg;
  const latitude_deg = jsonAnswer.latitude_deg;
  const icon = L.divIcon({className: "customMarker current"});
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

const b = document.createElement("button");
b.id = "nappi"
b.textContent = "aloita uusi peli"
b.addEventListener("click", () => {
  addPlayer()
})
document.querySelector("#scoreboard").append(b)


const mainMenuButton = document.querySelector(".startGame")
mainMenuButton.onclick = async () => {
  document.querySelector("#game").style.visibility = null
  document.querySelector("#mainMenu").style.display = "none"
}

addPlayer();
