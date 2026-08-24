import pytest
from unittest.mock import MagicMock, patch
from app.services.storage_service import StorageService
from app.core.config import settings

@pytest.mark.asyncio
async def test_storage_service_local():
    svc = StorageService()
    svc.backend = "local"
    
    test_data = b"ID3\x04\x00\x00\x00\x00\x00\x00test-audio-bytes"
    url = await svc.upload_audio("test_local_audio.mp3", test_data)
    assert url == "/api/v1/media/audio/test_local_audio.mp3"
    
    exists_url = await svc.audio_exists("test_local_audio.mp3")
    assert exists_url == "/api/v1/media/audio/test_local_audio.mp3"

@pytest.mark.asyncio
async def test_storage_service_r2_mock():
    with patch("app.core.config.settings.r2_account_id", "test-account"), \
         patch("app.core.config.settings.r2_access_key_id", "test-key"), \
         patch("app.core.config.settings.r2_secret_access_key", "test-secret"), \
         patch("app.core.config.settings.r2_bucket_name", "test-bucket"), \
         patch("app.core.config.settings.r2_public_url_prefix", "https://pub-audio.r2.dev"), \
         patch("boto3.client") as mock_boto:

        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3

        svc = StorageService()
        svc.backend = "r2"
        svc._s3_client = mock_s3

        test_data = b"r2-audio-bytes-12345"
        url = await svc.upload_audio("story_01.mp3", test_data)

        assert url == "https://pub-audio.r2.dev/audio/story_01.mp3"
        mock_s3.put_object.assert_called_once()

        # Test audio_exists in R2
        mock_s3.head_object.return_value = {"ContentLength": 100}
        exists_url = await svc.audio_exists("story_01.mp3")
        assert exists_url == "https://pub-audio.r2.dev/audio/story_01.mp3"

@pytest.mark.asyncio
async def test_health_check_serverless_fields(client):
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert "is_serverless" in data
    assert "storage_backend" in data
