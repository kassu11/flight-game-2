import random
from flask_cors import CORS
from flask import Flask, request
from geopy.distance import geodesic
import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv(".env")

connection = mysql.connector.connect(
    host='127.0.0.1',
    port=3306,
    database=os.environ.get("database"),
    user=os.environ.get("user"),
    password=os.environ.get("password"),
    autocommit=True
)
cursor = connection.cursor(buffered=True)


class Player:
    def __init__(self, nimi, airport):
        cursor.execute("SELECT max(CAST(id AS INT)) FROM game")

        id_result = cursor.fetchone()[0]
        if id_result == None:
            self.id = 1
        else:
            self.id = int(id_result) + 1

        self.nimi = nimi
        self.airport = airport
        self.co2 = 0
        self.score = 0
        self.co2max = 100000


app = Flask(__name__)
CORS(app)
app.config["cors_headers"] = "content-type"


@app.route("/tarkista-maakoodi/<maakoodi>")
def check_country(maakoodi):
    sql = f"SELECT iso_country FROM airport WHERE iso_country ='{maakoodi}';"
    cursor.execute(sql)
    result = cursor.fetchone()
    return {"result": result != None, "isocode": maakoodi}


@app.route("/code/<maakoodi>")
def get_country(maakoodi):
    sql = f"select country.name, airport.name, ident, latitude_deg, longitude_deg, type from airport, country where airport.iso_country = country.iso_country and airport.iso_country='{maakoodi}';"
    cursor.execute(sql)
    sql_answer = cursor.fetchall()
    if len(sql_answer) == 0:
        result = random.choice(all_airports)
        return list(result)
    result = random.choice(sql_answer)
    return list(result)


@app.route("/newplayer", methods=["POST"])
def new_player():
    if request.method == "POST":
        player_data = request.get_json(force=True)
        print(player_data["playerName"])
        print(player_data)

        Player(player_data["playerName"], player_data["airport"])
        return {"status": "ok"}

@app.route("/lake-lennon-tiedot", methods=["POST"])
def laske_matka():
    if request.method == "POST":
        json_response = request.get_json(force=True)
        alkukentta = json_response["alkuLentokentta"][3:5]
        nykynen_kentta = json_response["loppuLentokentta"][3:5]
        print(nykynen_kentta)
        matka = geodesic(alkukentta,nykynen_kentta).km
        points_by_type = {
            "small_airport": 10,
            "heliport": 15,
            "closed": -15,
            "medium_airport": 20,
            "seaplane_base": 30,
            "large_airport": 45,
            "balloonport": 90,
        }

        conversion = matka / 1000
        airport_type = json_response["loppuLentokentta"][5]
        score = points_by_type[airport_type] - conversion
        co2 = 2 * matka

        return {"matka": round(matka), "score": round(score,2), "co2": round(co2)}






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
            if s_airport[0] == airport[0]:
                break
            if airport[5] == "closed" and s_airport[5] == "closed":
                break
        else:
            airport_buttons.append(airport)
    return airport_buttons



if __name__ == "__main__":
    app.run(use_reloader=True, host="127.0.0.1", port=3000)
