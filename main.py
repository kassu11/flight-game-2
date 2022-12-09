import random
from flask_cors import CORS
from flask import Flask, request
from geopy.distance import geodesic
import mysql.connector
from dotenv import load_dotenv
import os
import json


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
        self.id = 1
        if len(players_list) > 0:
            self.id = players_list[-1].id + 1

        self.nimi = nimi
        self.airport = airport
        self.co2 = 0
        self.score = 0
        self.co2max = 100000
        self.matka = 0


app = Flask(__name__)
CORS(app)
app.config["cors_headers"] = "content-type"


def add_score_column():
  sql = 'SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "game" AND COLUMN_NAME = "score";'
  cursor.execute(sql)
  result = cursor.fetchall()
  if len(result) == 0: # If score column does not exist, create it
    cursor.execute("delete from goal_reached")
    cursor.execute("delete from game")
    cursor.execute("alter table game add score int")


@app.route("/matkusta", methods=["POST"])
def matkustaa():
    if request.method == "POST":
        player_data = request.get_json(force=True)
        # print(player_data["playerName"])
        # print(player_data)

        player_object = None

        for player in players_list:
            if player_data["playerId"] == player.id:
                player_object = player
                break
        if player_object != None:
            player_object.matka += player_data["matka"]
            player_object.co2 += player_data["co2"]
            player_object.score = round(
                player_object.score + player_data["score"], 1)
            player_object.airport = player_data["airport"]
            return player_object.__dict__

        return {"status": "Error"}


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


players_list = []


@app.route("/newplayer", methods=["POST"])
def new_player():

    if request.method == "POST":
        player_data = request.get_json(force=True)
        player = Player(player_data["playerName"], player_data["airport"])
        players_list.append(player)

        print(player_data["playerName"])
        print(player_data)
        print(players_list)
        return player.__dict__


@app.route("/laske-lennon-tiedot", methods=["POST"])
def laske_matka():
    if request.method == "POST":
        json_response = request.get_json(force=True)
        alkukentta = json_response["alkuLentokentta"][3:5]
        nykynen_kentta = json_response["loppuLentokentta"][3:5]
        airport_type = json_response["loppuLentokentta"][5]
        return calculate_flight_info(alkukentta, nykynen_kentta, airport_type)
        # print(nykynen_kentta)
        # matka = geodesic(alkukentta, nykynen_kentta).km
        # points_by_type = {
        #     "small_airport": 10,
        #     "heliport": 15,
        #     "closed": -15,
        #     "medium_airport": 20,
        #     "seaplane_base": 30,
        #     "large_airport": 45,
        #     "balloonport": 90,
        # }

        # conversion = matka / 1000
        # airport_type = json_response["loppuLentokentta"][5]
        # score = points_by_type[airport_type] - conversion
        # co2 = 2 * matka

        # return {"matka": round(matka), "score": round(score, 2), "co2": round(co2)}


def calculate_flight_info(start_airport, end_airport, type_of_airport):
    matka = geodesic(start_airport, end_airport).km
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
    score = points_by_type[type_of_airport] - conversion
    co2 = 2 * matka

    return {"matka": round(matka), "score": round(score, 2), "co2": round(co2)}

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
            alkukentta = airport_buttons[-1][3:5]
            nykynen_kentta = airport[3:5]
            matka = geodesic(alkukentta, nykynen_kentta).km
            if matka > 5000:
                break
        else:
            airport_buttons.append(airport)
    return airport_buttons

@app.route("/best-flight-path", methods=["POST"])
def best_flight_path():
    if request.method == "POST":
        json_response = request.get_json(force=True)
        length = len(json_response.airports) - 3
        for i in range(length):
            print(json_response.airports[i])


        return {"status":"ok"}
    

@app.route("/save", methods=["POST"])
def update_sql():
    if request.method == "POST":
        id = 1
        json_response = request.get_json(force=True)
        cursor.execute("SELECT max(CAST(id AS INT)) FROM game")
        id_result = cursor.fetchone()[0]
        if id_result != None:
            id = int(id_result) + 1
            
        cursor.execute( f"""insert into game(id, screen_name, score, co2_consumed)
        value ({id}, "{json_response["nimi"]}", {json_response["score"]}, {json_response["co2"]})""")

        return {"status":"Ok", "id":id}


@app.route("/scoreboard/")
def send_scoreboard():
    sql = "select screen_name, score, co2_consumed from game order by score desc limit 100;"
    cursor.execute(sql)
    result = cursor.fetchall()
    return result

@app.route("/scoreboard/<id>")
def scoreboard_by_id(id):
    int_id = int(id)
    sql = "select cast(id as int), screen_name, score, co2_consumed from game order by score desc;"
    cursor.execute(sql)
    result = cursor.fetchall()
    for riviNumero in range(len(result)):
        if result[riviNumero][0] == int_id:
            players = result[max(riviNumero-20, 0):riviNumero+21]
            return {"playerList": players, "startIndex": riviNumero}
    return {"error": "id not found"}


add_score_column()

if __name__ == "__main__":
    app.run(use_reloader=True, host="127.0.0.1", port=3000)
