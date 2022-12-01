

const map = L.map('map')

async function airportByIsocode(airportCountry) {
    const answer = await fetch(`http://127.0.0.1:3000/code/${airportCountry}`);
    const jsonAnswer = await answer.json();
    console.log(jsonAnswer);
    updateMap(jsonAnswer)
    return jsonAnswer;
}


async function addPlayer() {
    const playerName = prompt("Enter your name :");
    const startIsoCode = prompt('Enter the starting country code:');
    const airportData = await airportByIsocode(startIsoCode);

    await fetch("http://127.0.0.1:3000/newplayer", {
        method: "POST",
        body: JSON.stringify({airport: airportData, playerName: playerName})
    });

    const airportResponse = await fetch("http://127.0.0.1:3000/airport/6")
    const airportResponseJson = await airportResponse.json()
    const buttons = document.querySelectorAll('.button')

    airportResponseJson.forEach((value, index) => {
        console.log(value,index, buttons[index])
        const button = buttons[index]
        button.querySelector("p").textContent = value[1]
    });
}


function updateMap(jsonAnswer) {
    const longitude_deg = jsonAnswer.longitude_deg
    const latitude_deg = jsonAnswer.latitude_deg
    map.setView([latitude_deg, longitude_deg], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: ""}).addTo(map);

    L.marker([latitude_deg, longitude_deg]).addTo(map)
        .bindPopup(jsonAnswer.name)
        .openPopup();
}

addPlayer()
