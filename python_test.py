print("Testi")


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