import random
from flask_cors import CORS
from flask import Flask, request
import mysql.connector

connection = mysql.connector.connect(
    host='127.0.0.1',
    port=3306,
    database='flight_game1',
    user='root',
    password='Salasana1',
    autocommit=True
)
cursor = connection.cursor(buffered=True)

class Player:
    def __init__(self, nimi, airport):
        cursor.execute("SELECT max(CAST(id AS INT)) FROM game")

        id_result = cursor.fetchone()[0]
        if id_result == None: self.id = 1
        else: self.id = int(id_result) + 1

        self.nimi = nimi
        self.airport = airport
        self.co2 = 0
        self.score = 0
        self.co2max = 100000



app = Flask(__name__)
CORS(app)
app.config["cors_headers"] = "content-type"


@app.route("/code/<maakoodi>")
def get_country(maakoodi):
    sql = f"SELECT name, iso_country, municipality, latitude_deg, longitude_deg FROM airport WHERE iso_country='{maakoodi}';"
    cursor.execute(sql)
    result = random.choice(cursor.fetchall())
    return {"icao": result[1], "name": result[0], "municipality": result[2], "latitude_deg": result[3], "longitude_deg": result[4]}


@app.route("/newplayer", methods=["POST"])
def new_player():
    if request.method == "POST":
        player_data = request.get_json(force=True)
        print(player_data["playerName"])
        print(player_data)

        Player(player_data["playerName"], player_data["airport"])
        return {"status": "ok"}

cursor.execute("""
select country.name, airport.name, ident, 
  latitude_deg, longitude_deg, type from 
    airport, country where 
      airport.iso_country = country.iso_country""")
all_airports = cursor.fetchall()

@app.route("/airport/<numero>")
def choose_airport(numero):
    airport_buttons = []
    while len(airport_buttons) < int(numero):
        airport = random.choice(all_airports)
        for s_airport in airport_buttons:
            if s_airport[0] == airport[0]: break
            if airport[5] == "closed" and s_airport[5] == "closed": break
        else:
            airport_buttons.append(airport)
    return airport_buttons


if __name__ == "__main__":
    app.run(use_reloader=True, host="127.0.0.1", port=3000)