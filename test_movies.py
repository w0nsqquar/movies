import unittest
import sqlite3
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

class TestMoviesAdmin(unittest.TestCase):
    """10 тестов для сценария администратора (CRUD фильмов)"""
    
    def setUp(self):
        """Очищаем таблицу movies перед каждым тестом"""
        conn = sqlite3.connect("films.db")
        cursor = conn.cursor()
        cursor.execute("DELETE FROM movies")
        # Сбрасываем автоинкремент
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='movies'")
        conn.commit()
        conn.close()
    
    # ========== ТЕСТ 1: Получение всех фильмов (пустой список) ==========
    def test_01_get_all_movies_empty(self):
        response = client.get("/api/movies/")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)
        self.assertEqual(len(response.json()), 0)
    
    # ========== ТЕСТ 2: Успешное добавление фильма ==========
    def test_02_create_movie_success(self):
        response = client.post("/api/movies/", json={
            "title": "Тестовый фильм",
            "genre": "Драма",
            "year": 2025,
            "rating": 8.5
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Тестовый фильм")
        self.assertEqual(response.json()["year"], 2025)
        
        # Проверяем, что фильм реально добавился в БД
        conn = sqlite3.connect("films.db")
        cursor = conn.cursor()
        cursor.execute("SELECT title, year FROM movies WHERE title = 'Тестовый фильм'")
        row = cursor.fetchone()
        conn.close()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "Тестовый фильм")
    
    # ========== ТЕСТ 3: Добавление фильма с пустым названием ==========
    def test_03_create_movie_empty_title(self):
        response = client.post("/api/movies/", json={
            "title": "",
            "genre": "Комедия",
            "year": 2024,
            "rating": 7.0
        })
        self.assertEqual(response.status_code, 400)
    
    # ========== ТЕСТ 4: Добавление фильма с отрицательным рейтингом ==========
    def test_04_create_movie_negative_rating(self):
        response = client.post("/api/movies/", json={
            "title": "Плохой фильм",
            "genre": "Боевик",
            "year": 2023,
            "rating": -5.0
        })
        self.assertEqual(response.status_code, 400)
    
    # ========== ТЕСТ 5: Добавление фильма с рейтингом выше 10 ==========
    def test_05_create_movie_rating_above_10(self):
        response = client.post("/api/movies/", json={
            "title": "Переоценённый фильм",
            "genre": "Фантастика",
            "year": 2022,
            "rating": 11.0
        })
        self.assertEqual(response.status_code, 400)
    
    # ========== ТЕСТ 6: Добавление фильма с годом до 1888 ==========
    def test_06_create_movie_year_too_old(self):
        response = client.post("/api/movies/", json={
            "title": "Древний фильм",
            "genre": "История",
            "year": 1800,
            "rating": 5.0
        })
        self.assertEqual(response.status_code, 422)
    
    # ========== ТЕСТ 7: Получение фильма по существующему ID ==========
    def test_07_get_movie_by_id_success(self):
        # Создаём фильм
        create_resp = client.post("/api/movies/", json={
            "title": "Фильм по ID",
            "genre": "Триллер",
            "year": 2021,
            "rating": 7.5
        })
        movie_id = create_resp.json()["id"]
        
        # Получаем по ID
        response = client.get(f"/api/movies/{movie_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Фильм по ID")
    
    # ========== ТЕСТ 8: Получение фильма по несуществующему ID ==========
    def test_08_get_movie_not_found(self):
        response = client.get("/api/movies/99999")
        self.assertEqual(response.status_code, 404)
        self.assertIn("не найден", response.json()["detail"])
    
    # ========== ТЕСТ 9: Успешное обновление фильма ==========
    def test_09_update_movie_success(self):
        # Создаём фильм
        create_resp = client.post("/api/movies/", json={
            "title": "Старое название",
            "genre": "Мелодрама",
            "year": 2015,
            "rating": 6.0
        })
        movie_id = create_resp.json()["id"]
        
        # Обновляем
        update_resp = client.put(f"/api/movies/{movie_id}", json={
            "title": "Новое название",
            "rating": 9.0
        })
        self.assertEqual(update_resp.status_code, 200)
        self.assertEqual(update_resp.json()["title"], "Новое название")
        self.assertEqual(update_resp.json()["rating"], 9.0)
    
    # ========== ТЕСТ 10: Успешное удаление фильма ==========
    def test_10_delete_movie_success(self):
        # Создаём фильм
        create_resp = client.post("/api/movies/", json={
            "title": "Фильм на удаление",
            "genre": "Ужасы",
            "year": 2020,
            "rating": 4.5
        })
        movie_id = create_resp.json()["id"]
        
        # Удаляем
        delete_resp = client.delete(f"/api/movies/{movie_id}")
        self.assertEqual(delete_resp.status_code, 200)
        
        # Проверяем, что фильма больше нет
        get_resp = client.get(f"/api/movies/{movie_id}")
        self.assertEqual(get_resp.status_code, 404)

if __name__ == "__main__":
    unittest.main()