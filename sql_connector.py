import mysql.connector

def sql_connector():
    return mysql.connector.connect(
    host='127.0.0.1',
    port=3306,
    database='flight_game1',
    user='root',
    password='Salasana1',
    autocommit=True
)