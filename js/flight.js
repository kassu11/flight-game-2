let airportCountry = prompt('Enter the starting country code:');
const map = L.map('map')

async function kutsu(airportCountry) {
    const answer = await fetch(`http://127.0.0.1:3000/code/${airportCountry}`);
    const jsonAnswer = await answer.json();
    console.log(jsonAnswer);
    updateMap(jsonAnswer)

}

function updateMap(jsonAnswer) {
    const longitude_deg = jsonAnswer.longitude_deg
    const latitude_deg = jsonAnswer.latitude_deg
    map.setView([latitude_deg, longitude_deg], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker([latitude_deg, longitude_deg]).addTo(map)
        .bindPopup(jsonAnswer.name)
        .openPopup();
}

kutsu(airportCountry);





