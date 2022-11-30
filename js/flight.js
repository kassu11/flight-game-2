

const map = L.map('map')

async function airportByIsocode(airportCountry) {
    const answer = await fetch(`http://127.0.0.1:3000/code/${airportCountry}`);
    const jsonAnswer = await answer.json();
    console.log(jsonAnswer);
    updateMap(jsonAnswer)
    return jsonAnswer;
}

// async function get_Name(playerName) {
//     const nameAnswer = await fetch(`http://127.0.0.1:3000/newplayer/${playerName}`)
//     const data = await nameAnswer.text()
//     console.log(data);
// }

async function addPlayer() {
    const playerName = prompt("Enter your name :");
    const startIsoCode = prompt('Enter the starting country code:');

    const airportData = await airportByIsocode(startIsoCode);
    fetch("http://127.0.0.1:3000/newplayer", {
        method: "POST",
        body: JSON.stringify({airport: airportData, playerName: playerName})
    });
}
// get_Name(playerName)


function updateMap(jsonAnswer) {
    const longitude_deg = jsonAnswer.longitude_deg
    const latitude_deg = jsonAnswer.latitude_deg
    map.setView([latitude_deg, longitude_deg], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: ""}).addTo(map);

    L.marker([latitude_deg, longitude_deg]).addTo(map)
        .bindPopup(jsonAnswer.name)
        .openPopup();
}


addPlayer()


// airportByIsocode(airportCountry);





