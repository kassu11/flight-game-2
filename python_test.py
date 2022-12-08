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
