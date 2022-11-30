import random
from flask_cors import CORS
from flask import Flask, request
import mysql.connector


class Player:
    def __init__(self, id, nimi, airport, co2, score):
        self.id = id
        self.nimi = nimi
        self.airport = airport
        self.co2 = co2
        self.score = score
        self.co2max = 100000


connection = mysql.connector.connect(
    host='127.0.0.1',
    port=3306,
    database='flight_game1',
    user='root',
    password='Salasana1',
    autocommit=True
)

app = Flask(__name__)
CORS(app)
app.config["cors_headers"] = "content-type"


@app.route("/code/<maakoodi>")
def get_country(maakoodi):
    sql = f"SELECT name, iso_country, municipality, latitude_deg, longitude_deg FROM airport WHERE iso_country='{maakoodi}';"
    cursor = connection.cursor()
    cursor.execute(sql)
    result = random.choice(cursor.fetchall())
    return {"icao": result[1], "name": result[0], "municipality": result[2], "latitude_deg": result[3], "longitude_deg": result[4]}


@app.route("/newplayer", methods=["POST"])
def testi():
    if request.method == "POST":
        player_data = request.get_json(force=True)
        print(player_data["playerName"])
        print(player_data)
        return {"status": "ok"}


if __name__ == "__main__":
    app.run(use_reloader=True, host="127.0.0.1", port=3000)
