from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .database import init_db
from .routers import movies, reviews, auth

# Инициализация базы данных при запуске
init_db()

app = FastAPI(title="Фильмотека API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# РАЗДАЧА СТАТИЧЕСКИХ ФАЙЛОВ
app.mount("/posters", StaticFiles(directory="posters"), name="posters")


# Подключаем роутеры
app.include_router(movies.router)
app.include_router(reviews.router)
app.include_router(auth.router)

# Статические файлы
@app.get("/style.css")
async def get_css():
    return FileResponse("style.css")

@app.get("/app.js")
async def get_js():
    return FileResponse("app.js")

@app.get("/")
async def root():
    return FileResponse("index.html")