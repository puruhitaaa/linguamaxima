import logging
from typing import Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("linguamaxima.images")

# Fallback curated theme images for categories when API key is not configured or fails
FALLBACK_CATEGORY_IMAGES = {
    "travel": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80",
    "culture": "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80",
    "food": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80",
    "news": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80",
    "technology": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
    "science": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80",
    "entertainment": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    "daily-life": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
    "history": "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&auto=format&fit=crop&q=80",
    "nature": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80",
    "default": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80",
}

class ImageService:
    async def fetch_story_image(
        self,
        category_slug: str,
        query: Optional[str] = None
    ) -> str:
        """
        Fetches an illustration/photo from Pixabay or returns a curated fallback.
        """
        fallback_url = FALLBACK_CATEGORY_IMAGES.get(category_slug, FALLBACK_CATEGORY_IMAGES["default"])
        
        if not settings.pixabay_api_key:
            return fallback_url

        search_query = query if query else category_slug.replace("-", " ")
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    "https://pixabay.com/api/",
                    params={
                        "key": settings.pixabay_api_key,
                        "q": search_query,
                        "image_type": "photo",
                        "orientation": "horizontal",
                        "safesearch": "true",
                        "per_page": 3,
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    hits = data.get("hits", [])
                    if hits:
                        return hits[0].get("webformatURL", fallback_url)
        except Exception as e:
            logger.warning(f"Pixabay image search failed for '{search_query}': {e}")

        return fallback_url

image_service = ImageService()
