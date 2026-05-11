import unittest
import sqlite3
import os
import tempfile
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

class TestAuthUser(unittest.TestCase):
    """10 тестов для сценария пользователя (регистрация, вход, профиль, избранное)"""
    
    @classmethod
    def setUpClass(cls):
        """Создаём временную тестовую БД"""
        cls.test_db_path = tempfile.NamedTemporaryFile(delete=False).name
        cls.original_db_path = "films.db"
        
        # Создаём тестовую БД
        conn = sqlite3.connect(cls.test_db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                phone TEXT,
                birthday TEXT,
                genres TEXT
            )
        """)
        conn.commit()
        conn.close()
    
    def setUp(self):
        """Очищаем таблицу users перед каждым тестом"""
        conn = sqlite3.connect("films.db")
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users")
        conn.commit()
        conn.close()
    
    # ========== ТЕСТ 1: Успешная регистрация ==========
    def test_01_register_success(self):
        response = client.post("/api/auth/register", json={
            "name": "Иван Петров",
            "email": "ivan@example.com",
            "password": "secure123"
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("Регистрация успешна", response.json()["message"])
        
        # Проверяем, что пользователь реально создан в БД
        conn = sqlite3.connect("films.db")
        cursor = conn.cursor()
        cursor.execute("SELECT name, email FROM users WHERE email = 'ivan@example.com'")
        row = cursor.fetchone()
        conn.close()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "Иван Петров")
        self.assertEqual(row[1], "ivan@example.com")
    
    # ========== ТЕСТ 2: Регистрация с дублирующим email ==========
    def test_02_register_duplicate_email(self):
        # Первая регистрация
        client.post("/api/auth/register", json={
            "name": "Первый",
            "email": "duplicate@test.com",
            "password": "pass123"
        })
        # Вторая с тем же email
        response = client.post("/api/auth/register", json={
            "name": "Второй",
            "email": "duplicate@test.com",
            "password": "pass456"
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("уже зарегистрирован", response.json()["detail"])
    
    # ========== ТЕСТ 3: Регистрация с коротким паролем (<4 символов) ==========
    def test_03_register_short_password(self):
        response = client.post("/api/auth/register", json={
            "name": "Тест",
            "email": "short@test.com",
            "password": "123"
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("минимум 4", response.json()["detail"])
    
    # ========== ТЕСТ 4: Регистрация с пустым именем ==========
    def test_04_register_empty_name(self):
        response = client.post("/api/auth/register", json={
            "name": "",
            "email": "empty@test.com",
            "password": "12345"
        })
        self.assertEqual(response.status_code, 422)  # Validation error
    
    # ========== ТЕСТ 5: Регистрация с невалидным email ==========
    def test_05_register_invalid_email(self):
        response = client.post("/api/auth/register", json={
            "name": "Тест",
            "email": "not-an-email",
            "password": "12345"
        })
        self.assertEqual(response.status_code, 422)
    
    # ========== ТЕСТ 6: Успешный вход ==========
    def test_06_login_success(self):
        # Сначала регистрируемся
        client.post("/api/auth/register", json={
            "name": "LoginUser",
            "email": "login@test.com",
            "password": "secret123"
        })
        # Пытаемся войти
        response = client.post("/api/auth/login", json={
            "email": "login@test.com",
            "password": "secret123"
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "login@test.com")
    
    # ========== ТЕСТ 7: Вход с неверным паролем ==========
    def test_07_login_wrong_password(self):
        client.post("/api/auth/register", json={
            "name": "WrongPass",
            "email": "wrong@test.com",
            "password": "correct123"
        })
        response = client.post("/api/auth/login", json={
            "email": "wrong@test.com",
            "password": "wrong456"
        })
        self.assertEqual(response.status_code, 401)
        self.assertIn("Неверный", response.json()["detail"])
    
    # ========== ТЕСТ 8: Вход с несуществующим email ==========
    def test_08_login_nonexistent_email(self):
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "anything"
        })
        self.assertEqual(response.status_code, 401)
    
    # ========== ТЕСТ 9: Вход с пустым паролем ==========
    def test_09_login_empty_password(self):
        response = client.post("/api/auth/login", json={
            "email": "test@test.com",
            "password": ""
        })
        self.assertEqual(response.status_code, 422)
    
    # ========== ТЕСТ 10: Регистрация с очень длинным именем ==========
    def test_10_register_very_long_name(self):
        long_name = "A" * 200
        response = client.post("/api/auth/register", json={
            "name": long_name,
            "email": "long@test.com",
            "password": "12345"
        })
        self.assertEqual(response.status_code, 422)

if __name__ == "__main__":
    unittest.main()