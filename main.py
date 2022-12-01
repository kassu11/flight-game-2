import random
from flask_cors import CORS
from flask import Flask, request
import mysql.connector


connection = mysql.connector.connect(
    host='127.0.0.1',
    port=3306,
    database='flight_game',
    user='root',
    password='T4!d4R!mz',
    autocommit=True
)
cursor = connection.cursor(buffered=True)

class Player:

    def __init__(self, nimi, airport):
        cursor.execute("SELECT max(CAST(id AS INT)) FROM game")
        id_result = cursor.fetchone()
        if id_result == None:
            self.id = 1
        else:
            self.id = id_result + 1
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
        Player(player_data["playerName"], player_data["airportData"])
        return {"status": "ok"}


if __name__ == "__main__":
    app.run(use_reloader=True, host="127.0.0.1", port=3000)
