"""
AI Visual Search Service — CLIP ViT-B/32
ปรับปรุงให้สมบูรณ์:
  ✅ บันทึก/โหลด index ลง disk (ไม่ต้อง reindex ทุกครั้ง)
  ✅ Async background reindex (ไม่บล็อก server)
  ✅ ใช้รูปหลายรูปต่อสินค้า (average embedding)
  ✅ Progress tracking ระหว่าง indexing
  ✅ Incremental reindex (เฉพาะสินค้าใหม่/เปลี่ยน)
  ✅ Adaptive threshold + dynamic top-k
  ✅ Input validation (ประเภทไฟล์, ขนาด)
  ✅ Rate limiting
  ✅ .env support
  ✅ Structured logging
"""

import os
import io
import asyncio
import logging
import time
import pickle
from pathlib import Path
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from collections import defaultdict

import requests
import numpy as np
import mysql.connector
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from sklearn.metrics.pairwise import cosine_similarity
from contextlib import asynccontextmanager
from sentence_transformers import SentenceTransformer

# ─────────────────────────────────────────────
# .env support
# ─────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ .env loaded")
except ImportError:
    print("⚠️  python-dotenv not installed — using system env only")

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
log = logging.getLogger("ai-service")

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
DB_CONFIG = {
    "user":     os.getenv("DB_USERNAME", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "host":     os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_DATABASE", "ecom1"),
    "port":     int(os.getenv("DB_PORT", "3306")),
}
NESTJS_BASE_URL     = os.getenv("NESTJS_BASE_URL", "http://localhost:3000")
INDEX_CACHE_DIR     = Path(os.getenv("INDEX_CACHE_DIR", "./index_cache"))
# สแกน 1 รูป = แสดงแค่รายการที่ตรง/ใกล้เคียง ไม่ล้นเป็นสิบรายการ
MAX_RESULTS           = int(os.getenv("MAX_RESULTS", "5"))               # ตรงกับรูป สูงสุด 5 รายการ
MAX_TOTAL_VISUAL      = int(os.getenv("MAX_TOTAL_VISUAL", "10"))         # ผลรวมไม่เกิน 10 (1 ภาพ → ไม่เกิน 10)
MIN_SCORE             = float(os.getenv("MIN_SCORE", "0.20"))
RELEVANT_THRESHOLD    = float(os.getenv("RELEVANT_THRESHOLD", "0.30"))   # ขึ้นไป = ตรงกับรูป
OTHERS_THRESHOLD      = float(os.getenv("OTHERS_THRESHOLD", "0.20"))     # ระหว่างนี้ = สินค้าอื่นๆ
MAX_OTHERS            = int(os.getenv("MAX_OTHERS", "3"))               # สินค้าอื่นๆ สูงสุด 3 รายการ
MAX_FILE_SIZE_MB      = float(os.getenv("MAX_FILE_SIZE_MB", "10"))
RATE_LIMIT_RPS      = int(os.getenv("RATE_LIMIT_RPS", "5"))
IMAGES_PER_PRODUCT  = int(os.getenv("IMAGES_PER_PRODUCT", "3"))
HTTP_TIMEOUT        = int(os.getenv("HTTP_TIMEOUT", "10"))
ALLOWED_MIMETYPES   = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"}

INDEX_CACHE_DIR.mkdir(parents=True, exist_ok=True)
VECTORS_PATH = INDEX_CACHE_DIR / "product_vectors.npy"
IDS_PATH     = INDEX_CACHE_DIR / "product_ids.pkl"
META_PATH   = INDEX_CACHE_DIR / "index_meta.pkl"

# ─────────────────────────────────────────────
# Load AI Model
# ─────────────────────────────────────────────
log.info("Loading CLIP ViT-B/32 model...")
log.info("(First run downloads ~600MB — subsequent runs use local cache)")
model = SentenceTransformer("clip-ViT-B-32")
log.info("✅ Model loaded")

# ─────────────────────────────────────────────
# Global State
# ─────────────────────────────────────────────
state = {
    "vectors_matrix": None,
    "product_ids":    [],
    "is_indexing":    False,
    "index_progress": 0,
    "index_total":    0,
    "index_failed":   0,
    "last_indexed":   None,
    "last_index_ms":  0,
}

_rate_tracker: dict[str, list[float]] = {}
executor = ThreadPoolExecutor(max_workers=4)

# ─────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────
def get_db():
    try:
        conn = mysql.connector.connect(**DB_CONFIG, connection_timeout=5)
        return conn
    except mysql.connector.Error as e:
        log.error(f"DB connection error: {e}")
        return None


def _resolve_url(url: str) -> str:
    if url.startswith("http"):
        return url
    return f"{NESTJS_BASE_URL}/{url.lstrip('/')}"


# ─────────────────────────────────────────────
# Feature Extraction
# ─────────────────────────────────────────────
def _preprocess_image(img: Image.Image) -> Image.Image:
    """ครอปตรงกลาง 85% — ลด noise ขอบภาพ. CLIP จัดการ resize/normalize เอง"""
    img = img.convert("RGB")
    w, h = img.size
    bw, bh = int(w * 0.85), int(h * 0.85)
    left = (w - bw) // 2
    top  = (h - bh) // 2
    return img.crop((left, top, left + bw, top + bh))


def extract_feature(image_bytes: bytes, crop: bool = True) -> Optional[np.ndarray]:
    """คืน L2-normalized CLIP vector หรือ None ถ้า error"""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if crop:
            img = _preprocess_image(img)
        else:
            img = img.convert("RGB")
        vec = model.encode(img, show_progress_bar=False)
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec
    except (UnidentifiedImageError, Exception) as e:
        log.warning(f"Feature extraction failed: {e}")
        return None


def fetch_image_bytes(url: str) -> Optional[bytes]:
    try:
        r = requests.get(url, timeout=HTTP_TIMEOUT, stream=True)
        if r.status_code == 200:
            content = r.content
            if len(content) > 0:
                return content
        log.warning(f"HTTP {r.status_code} for {url}")
        return None
    except Exception as e:
        log.warning(f"Fetch error {url}: {e}")
        return None


# ─────────────────────────────────────────────
# Index Persistence
# ─────────────────────────────────────────────
def save_index():
    """บันทึก vectors + ids ลง disk"""
    if state["vectors_matrix"] is None or len(state["product_ids"]) == 0:
        return
    np.save(VECTORS_PATH, state["vectors_matrix"])
    with open(IDS_PATH, "wb") as f:
        pickle.dump(state["product_ids"], f)
    meta = {
        "last_indexed": state["last_indexed"],
        "count": len(state["product_ids"]),
    }
    with open(META_PATH, "wb") as f:
        pickle.dump(meta, f)
    log.info(f"✅ Index saved to disk ({len(state['product_ids'])} products)")


def load_index() -> bool:
    """โหลด index จาก disk ถ้ามี — คืน True ถ้าสำเร็จ"""
    if not VECTORS_PATH.exists() or not IDS_PATH.exists():
        return False
    try:
        matrix = np.load(VECTORS_PATH)
        with open(IDS_PATH, "rb") as f:
            ids = pickle.load(f)
        meta = {}
        if META_PATH.exists():
            with open(META_PATH, "rb") as f:
                meta = pickle.load(f)

        state["vectors_matrix"] = matrix
        state["product_ids"]    = ids
        state["last_indexed"]   = meta.get("last_indexed", "unknown")
        log.info(f"✅ Loaded index from disk: {len(ids)} products (last indexed: {state['last_indexed']})")
        return True
    except Exception as e:
        log.error(f"Failed to load index from disk: {e}")
        return False


# ─────────────────────────────────────────────
# Core Indexing (รันใน thread pool ไม่บล็อก)
# ─────────────────────────────────────────────
def _do_index(incremental: bool = False):
    """
    incremental=True  → เฉพาะสินค้าใหม่ (ที่ยังไม่มีใน state)
    incremental=False → full rebuild
    """
    if state["is_indexing"]:
        log.warning("Indexing already in progress — skipped")
        return

    state["is_indexing"]    = True
    state["index_progress"] = 0
    state["index_failed"]   = 0
    t_start = time.time()

    try:
        conn = get_db()
        if conn is None:
            log.error("Cannot connect to DB for indexing")
            return

        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT p.id AS productId, i.url
            FROM product p
            JOIN image i ON p.id = i.productId
            ORDER BY p.id, i.id
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        product_images: dict[int, list[str]] = defaultdict(list)
        for row in rows:
            pid = row["productId"]
            if len(product_images[pid]) < IMAGES_PER_PRODUCT:
                product_images[pid].append(row["url"])

        existing_ids = set(state["product_ids"]) if incremental else set()
        to_index = {
            pid: urls for pid, urls in product_images.items()
            if pid not in existing_ids
        }

        state["index_total"] = len(to_index)
        log.info(
            f"{'Incremental' if incremental else 'Full'} index: "
            f"{len(to_index)} products to process "
            f"{'(skipping ' + str(len(existing_ids)) + ' existing)' if incremental else ''}"
        )

        new_vectors = []
        new_ids     = []
        done        = 0

        for pid, urls in to_index.items():
            vecs = []
            for url in urls:
                full_url = _resolve_url(url)
                img_bytes = fetch_image_bytes(full_url)
                if img_bytes:
                    vec = extract_feature(img_bytes, crop=True)
                    if vec is not None:
                        vecs.append(vec)

            if vecs:
                avg_vec = np.mean(vecs, axis=0)
                norm = np.linalg.norm(avg_vec)
                avg_vec = avg_vec / norm if norm > 0 else avg_vec
                new_vectors.append(avg_vec)
                new_ids.append(pid)
            else:
                state["index_failed"] += 1

            done += 1
            state["index_progress"] = done
            if done % 20 == 0:
                log.info(f"  Progress: {done}/{state['index_total']}")

        if incremental and state["vectors_matrix"] is not None and len(state["product_ids"]) > 0:
            all_vecs = list(state["vectors_matrix"]) + new_vectors
            all_ids  = list(state["product_ids"])   + new_ids
        else:
            all_vecs = new_vectors
            all_ids  = new_ids

        if all_vecs:
            state["vectors_matrix"] = np.array(all_vecs)
            state["product_ids"]    = all_ids
            state["last_indexed"]   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            state["last_index_ms"]  = int((time.time() - t_start) * 1000)
            save_index()
            log.info(
                f"✅ Index complete: {len(all_ids)} total products | "
                f"new={len(new_ids)} failed={state['index_failed']} | "
                f"time={state['last_index_ms']}ms"
            )
        else:
            log.error("❌ No products indexed. Check DB and image URLs.")

    except Exception as e:
        log.exception(f"Unexpected indexing error: {e}")
    finally:
        state["is_indexing"] = False


# ─────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("=" * 55)
    log.info("🚀  AI Visual Search Service  (CLIP ViT-B/32)")
    log.info("=" * 55)
    log.info(f"Database : {DB_CONFIG['database']}@{DB_CONFIG['host']}")
    log.info(f"NestJS   : {NESTJS_BASE_URL}")
    log.info(f"Cache dir: {INDEX_CACHE_DIR.resolve()}")
    log.info("=" * 55)

    if not load_index():
        log.info("No cached index found — starting full index...")
        loop = asyncio.get_event_loop()
        loop.run_in_executor(executor, _do_index, False)
    else:
        loop = asyncio.get_event_loop()
        loop.run_in_executor(executor, _do_index, True)

    yield
    log.info("Shutting down AI Service...")


app = FastAPI(
    title="AI Visual Search Service",
    description="CLIP ViT-B/32 based product visual search for E-Commerce",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path == "/visual-search":
        ip = request.client.host if request.client else "unknown"
        now = time.time()
        window = 1.0
        hits = _rate_tracker.get(ip, [])
        hits = [t for t in hits if now - t < window]
        if len(hits) >= RATE_LIMIT_RPS:
            return JSONResponse(
                status_code=429,
                content={"error": f"Rate limit: max {RATE_LIMIT_RPS} requests/second"}
            )
        hits.append(now)
        _rate_tracker[ip] = hits
    return await call_next(request)


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────
@app.get("/", summary="Service info")
def root():
    return {
        "service": "AI Visual Search",
        "model": "clip-ViT-B-32",
        "status": "indexing" if state["is_indexing"] else "ready",
        "indexed_products": len(state["product_ids"]),
        "last_indexed": state["last_indexed"],
        "database": DB_CONFIG["database"],
    }


@app.get("/health", summary="Health check")
def health():
    return {
        "status": "healthy",
        "model_loaded": True,
        "index_ready": state["vectors_matrix"] is not None,
        "indexed_products": len(state["product_ids"]),
        "is_indexing": state["is_indexing"],
        "last_indexed": state["last_indexed"],
    }


@app.get("/status", summary="Indexing progress")
def index_status():
    return {
        "is_indexing":      state["is_indexing"],
        "progress":         state["index_progress"],
        "total":            state["index_total"],
        "percent":          round(state["index_progress"] / state["index_total"] * 100, 1)
                            if state["index_total"] > 0 else 100,
        "indexed_products": len(state["product_ids"]),
        "failed_products":  state["index_failed"],
        "last_indexed":     state["last_indexed"],
        "last_index_ms":    state["last_index_ms"],
    }


def _run_reindex(full: bool) -> JSONResponse:
    if state["is_indexing"]:
        return JSONResponse(
            status_code=409,
            content={"message": "Indexing already in progress", "indexed": len(state["product_ids"])}
        )
    if full:
        state["vectors_matrix"] = None
        state["product_ids"]    = []
        for p in [VECTORS_PATH, IDS_PATH, META_PATH]:
            p.unlink(missing_ok=True)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, _do_index, not full)
    return JSONResponse(
        status_code=202,
        content={
            "message": f"{'Full' if full else 'Incremental'} reindex started in background",
            "check_progress": "/status"
        }
    )


@app.get("/reindex", summary="Trigger re-index (GET — backward compatible)")
async def trigger_reindex_get(full: bool = Query(False, description="True = full rebuild")):
    """เดิมใช้ GET /reindex — ยังรองรับอยู่; แนะนำใช้ POST /reindex"""
    return _run_reindex(full)


@app.post("/reindex", summary="Trigger re-index (background)")
async def trigger_reindex_post(full: bool = Query(False, description="True = full rebuild, False = incremental")):
    return _run_reindex(full)


@app.post("/visual-search", summary="Search products by image")
async def visual_search(
    file: UploadFile = File(..., description="ไฟล์รูปภาพ (jpg/png/webp)"),
    top_k: int = Query(default=MAX_RESULTS, ge=1, le=10, description="จำนวนผลที่ตรงกับรูป (สแกน 1 รูป = แนะนำไม่เกิน 10)"),
    min_score: float = Query(default=MIN_SCORE, ge=0.0, le=1.0, description="คะแนนขั้นต่ำ"),
):
    """Backend ส่ง field ชื่อ 'file' — รับได้ตรงกับ FormData.append('file', ...)"""
    if state["vectors_matrix"] is None or len(state["product_ids"]) == 0:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Index not ready",
                "is_indexing": state["is_indexing"],
                "message": "POST /reindex แล้วรอ /status progress = 100%"
            }
        )

    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIMETYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {content_type}. Allowed: {', '.join(ALLOWED_MIMETYPES)}"
        )

    image_bytes = await file.read()
    size_mb = len(image_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size_mb:.1f}MB (max {MAX_FILE_SIZE_MB}MB)"
        )
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        Image.open(io.BytesIO(image_bytes)).verify()
    except (UnidentifiedImageError, Exception):
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file")

    query_vec = extract_feature(image_bytes, crop=True)
    if query_vec is None:
        raise HTTPException(status_code=422, detail="Cannot extract features from image")

    matrix = state["vectors_matrix"]
    scores = cosine_similarity(query_vec.reshape(1, -1), matrix)[0]
    top_n = min(MAX_TOTAL_VISUAL * 2, len(scores))
    top_idx = np.argsort(scores)[::-1][:top_n]

    # แยกเป็น 2 กลุ่ม: ตรงกับรูป (results) กับ สินค้าอื่นๆ (others)
    results = []  # score >= RELEVANT_THRESHOLD
    others = []   # OTHERS_THRESHOLD <= score < RELEVANT_THRESHOLD
    seen_ids = set()

    for idx in top_idx:
        score = float(scores[idx])
        pid = int(state["product_ids"][idx])
        if pid in seen_ids:
            continue
        seen_ids.add(pid)
        item = {"id": pid, "score": round(score, 4)}
        if score >= RELEVANT_THRESHOLD:
            results.append(item)
            if len(results) >= top_k:
                continue
        elif score >= OTHERS_THRESHOLD and len(others) < MAX_OTHERS:
            others.append(item)

    # ถ้าไม่มีผลที่ "ตรงกับรูป" เลย ใช้ adaptive: เอา top ที่มี score สูงสุดเป็น results
    used_threshold = RELEVANT_THRESHOLD
    if len(results) == 0 and len(top_idx) > 0:
        best_score = float(scores[top_idx[0]])
        if best_score > 0.10:
            adaptive_min = max(best_score * 0.75, 0.10)
            results = []
            others = []
            seen_ids = set()
            for idx in top_idx:
                score = float(scores[idx])
                pid = int(state["product_ids"][idx])
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)
                item = {"id": pid, "score": round(score, 4)}
                if score >= adaptive_min:
                    results.append(item)
                    if len(results) >= top_k:
                        break
                elif score >= 0.10 and len(others) < MAX_OTHERS:
                    others.append(item)
            used_threshold = adaptive_min
            log.info(f"Adaptive: threshold={adaptive_min:.2f} (best={best_score:.4f})")

    # Fallback: ถ้ายังไม่มีผลเลยแต่มี index — ส่ง top ตาม score ไปเป็น results เพื่อไม่ให้ขึ้น 0 รายการ
    if len(results) == 0 and len(others) == 0 and len(top_idx) > 0:
        for idx in top_idx[:top_k]:
            results.append({
                "id": int(state["product_ids"][idx]),
                "score": round(float(scores[idx]), 4),
            })
        log.info(f"Fallback: returning top {len(results)} by score (no item passed threshold)")

    # จำกัดจำนวนรวมไม่เกิน MAX_TOTAL_VISUAL (กันขึ้น 40 รายการ)
    total = len(results) + len(others)
    if total > MAX_TOTAL_VISUAL:
        if len(results) >= MAX_TOTAL_VISUAL:
            results = results[:MAX_TOTAL_VISUAL]
            others = []
        else:
            others = others[: max(0, MAX_TOTAL_VISUAL - len(results))]
        log.info(f"Capped total to {MAX_TOTAL_VISUAL} (was {total})")

    top_scores_debug = [round(float(scores[i]), 4) for i in top_idx[:5]]
    log.info(
        f"Visual search: relevant={len(results)} others={len(others)} "
        f"top_scores={top_scores_debug} file={file.filename}"
    )

    return {
        "results":         results,
        "others":          others,
        "total_indexed":   len(state["product_ids"]),
        "count":           len(results),
        "top_scores":      top_scores_debug,
        "used_threshold":  round(used_threshold, 4),
        "query_file":      file.filename,
    }


@app.delete("/index-cache", summary="ลบ index cache ทั้งหมด")
def clear_cache():
    for p in [VECTORS_PATH, IDS_PATH, META_PATH]:
        p.unlink(missing_ok=True)
    state["vectors_matrix"] = None
    state["product_ids"]    = []
    state["last_indexed"]   = None
    return {"message": "Cache cleared. Call POST /reindex?full=true to rebuild."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=False,
        workers=1,
    )
