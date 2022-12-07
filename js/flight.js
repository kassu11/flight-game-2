const map = L.map('map');
const allMarkers = [];
let currentAirport = null;
let currentPlayer = null;

Number.prototype.formatNumbers = function(e) {
  return this.toLocaleString('ja-JP', {style: 'currency', currency: 'JPY'}).
      slice(1);
};

async function airportByIsocode(airportCountry) {
  const answer = await fetch(`http://127.0.0.1:3000/code/${airportCountry}`);
  const jsonAnswer = await answer.json();
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
  const isoResult = await fetch(
      `http://127.0.0.1:3000/tarkista-maakoodi/${startIsoCode}`,
  );
  const isoResultJson = await isoResult.json();
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

  const playerResponse = await fetch('http://127.0.0.1:3000/newplayer', {
    method: 'POST',
    body: JSON.stringify({airport: airportData, playerName: playerName}),
  });
  const playerJson = await playerResponse.json();
  console.log(playerJson);
  currentPlayer = playerJson;
  getNewAirports(6);
}

async function getNewAirports(numb) {
  const airportResponse = await fetch(`http://127.0.0.1:3000/airport/${numb}`);
  const airportResponseJson = await airportResponse.json();
  const buttons = document.querySelectorAll('.buttons button');

  airportResponseJson.forEach((airport, index) => {
    const button = buttons[index];
    button.querySelector('span').textContent = airport[1];
    button.onclick = async () => {
      const calculateResponse = await fetch(
          `http://127.0.0.1:3000/laske-lennon-tiedot`,
          {
            method: 'POST',
            body: JSON.stringify({
              alkuLentokentta: currentAirport,
              loppuLentokentta: airport,
            }),
          },
      );
      const calculateJson = await calculateResponse.json();
      console.log(calculateJson.score);
      const playerResponse = await fetch(`http://127.0.0.1:3000/matkusta`, {
        method: 'POST',
        body: JSON.stringify({
          matka: calculateJson.matka,
          score: calculateJson.score,
          co2: calculateJson.co2,
          playerId: currentPlayer.id,
          airport,
        }),
      });

      const playerJson = await playerResponse.json();
      currentPlayer = playerJson;
      console.log(currentPlayer);
      updatePlayerInterface(currentPlayer);
      currentAirport = airport;
      removeAllMarkers();
      updateMap({
        longitude_deg: airport[4],
        latitude_deg: airport[3],
        name: airport[1],
      });
      if(currentPlayer.co2 >= currentPlayer.co2max) endGame()
      else getNewAirports(numb);
      


    };
  });
}

async function saveGame(){
  const updateResponse = await fetch(`http://127.0.0.1:3000/save`, {
    method: 'POST',
    body: JSON.stringify(currentPlayer)
  })
  const updateJson = await updateResponse.json()
}

function endGame(){
  const lopettaa = confirm("haluatko jatkaa peliä")
  if(lopettaa) addPlayer()
  else { 
    const buttons = document.querySelectorAll('.buttons button')
    buttons.forEach(button => button.onclick = null)
  } 
  saveGame()
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
  map.setView([latitude_deg, longitude_deg], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '',
  }).addTo(map);

  const marker = L.marker([latitude_deg, longitude_deg]).
      addTo(map).
      bindPopup(jsonAnswer.name).
      openPopup();
  allMarkers.push(marker);
}

function removeAllMarkers() {
  allMarkers.forEach((marker) => map.removeLayer(marker));
  allMarkers.length = 0;
}

addPlayer();
