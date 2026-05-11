import unittest
import sqlite3
import os
import subprocess
import json
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db_connection, init_db

client = TestClient(app)

class TestDevOpsTechnical(unittest.TestCase):
    """10 тестов для сценария DevOps/Тестировщика"""
    
    # ========== ТЕСТ 1: Подключение к БД успешно ==========
    def test_01_db_connection_success(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            conn.close()
            self.assertIsNotNone(result)
        except Exception as e:
            self.fail(f"Подключение к БД не удалось: {e}")
    
    # ========== ТЕСТ 2: Таблицы создаются корректно ==========
    def test_02_db_tables_created(self):
        init_db()  # Повторная инициализация не должна ломать таблицы
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Проверяем наличие таблиц
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='movies'")
        self.assertIsNotNone(cursor.fetchone())
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        self.assertIsNotNone(cursor.fetchone())
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'")
        self.assertIsNotNone(cursor.fetchone())
        
        conn.close()
    
    # ========== ТЕСТ 3: API возвращает JSON ==========
    def test_03_api_returns_json(self):
        response = client.get("/api/movies/")
        self.assertEqual(response.headers["content-type"], "application/json")
    
    # ========== ТЕСТ 4: CORS заголовки присутствуют ==========
    def test_04_cors_headers_present(self):
        response = client.options("/api/movies/", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        })
        # CORS headers должны быть
        self.assertIn("access-control-allow-origin", response.headers)
    
    # ========== ТЕСТ 5: Статические файлы раздаются ==========
    def test_05_static_files_serving(self):
        response = client.get("/style.css")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "text/css; charset=utf-8")
        
        response = client.get("/app.js")
        self.assertEqual(response.status_code, 200)
    
    # ========== ТЕСТ 6: Обработка 404 ошибки ==========
    def test_06_404_error_handling(self):
        response = client.get("/nonexistent/endpoint/12345")
        self.assertEqual(response.status_code, 404)
    
    # ========== ТЕСТ 7: Главная страница загружается ==========
    def test_07_root_index_loaded(self):
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response.headers["content-type"])
        self.assertIn(b"MovieBase", response.content)
    
    # ========== ТЕСТ 8: Добавление отзыва через API ==========
    def test_08_create_review_success(self):
        # Сначала создаём фильм
        movie_resp = client.post("/api/movies/", json={
            "title": "Фильм для отзыва",
            "genre": "Драма",
            "year": 2024,
            "rating": 8.0
        })
        movie_id = movie_resp.json()["id"]
        
        # Добавляем отзыв
        response = client.post("/api/reviews/", json={
            "movie_id": movie_id,
            "rating": 9,
            "comment": "Отличный фильм, рекомендую!",
            "user_id": 1
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("Отзыв добавлен", response.json()["message"])
    
    # ========== ТЕСТ 9: Получение отзывов для фильма ==========
    def test_09_get_reviews_for_movie(self):
        # Создаём фильм
        movie_resp = client.post("/api/movies/", json={
            "title": "Фильм с отзывами",
            "genre": "Комедия",
            "year": 2023,
            "rating": 7.5
        })
        movie_id = movie_resp.json()["id"]
        
        # Добавляем отзывы
        client.post("/api/reviews/", json={
            "movie_id": movie_id,
            "rating": 8,
            "comment": "Хорошо",
            "user_id": 1
        })
        
        # Получаем отзывы
        response = client.get(f"/api/reviews/{movie_id}")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)
    
    # ========== ТЕСТ 10: Отзыв с невалидной оценкой (0) ==========
    def test_10_review_invalid_rating_low(self):
        movie_resp = client.post("/api/movies/", json={
            "title": "Тестовый фильм",
            "genre": "Боевик",
            "year": 2022,
            "rating": 6.0
        })
        movie_id = movie_resp.json()["id"]
        
        response = client.post("/api/reviews/", json={
            "movie_id": movie_id,
            "rating": 0,
            "comment": "Слишком низкая оценка",
            "user_id": 1
        })
        self.assertEqual(response.status_code, 422)

if __name__ == "__main__":
    unittest.main()