from app.core.config import Settings


def test_settings_splits_cors_origins() -> None:
    settings = Settings(CORS_ORIGINS="http://localhost:5173, https://admin.example.com")

    assert settings.cors_origins_list == ["http://localhost:5173", "https://admin.example.com"]
