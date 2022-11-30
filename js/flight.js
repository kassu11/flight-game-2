let airportCountry = prompt('Enter the starting country code:');

async function kutsu(airportCountry) {
  const answer = await fetch(`http://127.0.0.1:3000/code/${airportCountry}`);
  const jsonAnswer = await answer.json();
  console.log(jsonAnswer);
}

kutsu(airportCountry);