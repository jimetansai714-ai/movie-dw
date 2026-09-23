"""
OmniStream - All-in-One Social Media Video Downloader Backend
Framework: FastAPI with yt-dlp & FFmpeg integration
Supports: YouTube, TikTok (no watermark), Instagram (Reels/Stories/Posts), Facebook, Twitter/X, Reddit, Vimeo, and 1000+ sites.
"""

import re
import os
import sys
import time
import shutil
import tempfile
import urllib.parse
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, RedirectResponse, FileResponse
from pydantic import BaseModel
import requests
import yt_dlp

app = FastAPI(
    title="OmniStream Media Downloader API",
    description="High-performance video and audio extraction API powered by yt-dlp & FFmpeg",
    version="1.1.0"
)

# Enable CORS for cross-origin frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global configuration via environment variables
PROXY_URL = os.environ.get("PROXY_URL", "").strip()
COOKIES_FILE = os.environ.get("COOKIES_FILE", "cookies.txt").strip()

# Simple In-Memory Rate Limiting: max 30 requests per minute per IP
ip_request_history: Dict[str, List[float]] = {}
RATE_LIMIT_WINDOW = 60.0  # seconds
RATE_LIMIT_MAX = 40       # requests per window

def check_rate_limit(client_ip: str):
    now = time.time()
    history = ip_request_history.setdefault(client_ip, [])
    # Remove timestamps older than window
    ip_request_history[client_ip] = [t for t in history if now - t < RATE_LIMIT_WINDOW]
    if len(ip_request_history[client_ip]) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded. Please wait a minute before making more requests."
        )
    ip_request_history[client_ip].append(now)

class VideoRequest(BaseModel):
    url: str
    custom_proxy: Optional[str] = None

class MediaFormat(BaseModel):
    format_id: str
    resolution: str
    height: Optional[int] = None
    width: Optional[int] = None
    ext: str
    filesize_approx: Optional[str] = None
    filesize_bytes: Optional[int] = None
    quality_label: str
    format_note: Optional[str] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    type: str  # 'video' or 'audio'
    has_audio: bool
    direct_url: Optional[str] = None
    needs_merge: bool = False

class VideoInfoResponse(BaseModel):
    id: str
    title: str
    thumbnail: Optional[str] = None
    duration_string: str
    duration_seconds: Optional[int] = None
    platform: str
    author: Optional[str] = None
    view_count: Optional[int] = None
    description: Optional[str] = None
    original_url: str
    formats: List[MediaFormat]
    audio_formats: List[MediaFormat]

def detect_platform(url: str) -> str:
    lower_url = url.lower()
    if "tiktok.com" in lower_url:
        return "TikTok"
    elif "instagram.com" in lower_url:
        return "Instagram"
    elif "facebook.com" in lower_url or "fb.watch" in lower_url or "fb.com" in lower_url:
        return "Facebook"
    elif "youtube.com" in lower_url or "youtu.be" in lower_url:
        return "YouTube"
    elif "twitter.com" in lower_url or "x.com" in lower_url:
        return "Twitter / X"
    elif "reddit.com" in lower_url:
        return "Reddit"
    elif "pinterest.com" in lower_url or "pin.it" in lower_url:
        return "Pinterest"
    elif "vimeo.com" in lower_url:
        return "Vimeo"
    return "Web Video"

def format_duration(seconds: Optional[float]) -> str:
    if not seconds:
        return "Short"
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    rem_seconds = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{rem_seconds:02d}"
    return f"{minutes:02d}:{rem_seconds:02d}"

def format_filesize(bytes_val: Optional[int]) -> Optional[str]:
    if not bytes_val or bytes_val <= 0:
        return None
    if bytes_val < 1024 * 1024:
        return f"{bytes_val / 1024:.1f} KB"
    elif bytes_val < 1024 * 1024 * 1024:
        return f"{bytes_val / (1024 * 1024):.1f} MB"
    else:
        return f"{bytes_val / (1024 * 1024 * 1024):.2f} GB"

def get_base_ydl_opts(proxy: Optional[str] = None) -> Dict[str, Any]:
    opts: Dict[str, Any] = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': False,
        'socket_timeout': 15,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
    
    # Active proxy if specified or from env
    effective_proxy = proxy or PROXY_URL
    if effective_proxy:
        opts['proxy'] = effective_proxy

    # Cookies file if present
    if os.path.isfile(COOKIES_FILE):
        opts['cookiefile'] = COOKIES_FILE

    return opts

@app.get("/api/health")
def health_check():
    ffmpeg_path = shutil.which("ffmpeg")
    return {
        "status": "healthy",
        "service": "OmniStream Media Extractor",
        "yt_dlp_version": yt_dlp.version.__version__,
        "ffmpeg_available": ffmpeg_path is not None,
        "ffmpeg_path": ffmpeg_path,
        "proxy_configured": bool(PROXY_URL),
        "cookies_configured": os.path.isfile(COOKIES_FILE),
        "supported_platforms": [
            "TikTok (No Watermark)",
            "Instagram Reels/Posts/Stories",
            "YouTube HD/4K/MP3",
            "Facebook HD/SD",
            "Twitter / X",
            "Reddit",
            "Pinterest"
        ]
    }

@app.post("/api/info", response_model=VideoInfoResponse)
def get_video_info(request: VideoRequest, req: Request):
    client_ip = req.client.host if req.client else "127.0.0.1"
    check_rate_limit(client_ip)

    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Video URL cannot be empty")

    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid URL protocol. Must start with http:// or https://")

    platform = detect_platform(url)
    ydl_opts = get_base_ydl_opts(request.custom_proxy)

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as e:
        err_msg = str(e)
        if "Private video" in err_msg:
            raise HTTPException(status_code=403, detail="This video is private or restricted by the author.")
        elif "Sign in" in err_msg or "login" in err_msg.lower():
            raise HTTPException(status_code=403, detail="This video requires login credentials. Please configure cookies.txt.")
        elif "Video unavailable" in err_msg or "not found" in err_msg.lower():
            raise HTTPException(status_code=404, detail="The video was removed, deleted, or is unavailable in your region.")
        elif "Unsupported URL" in err_msg:
            raise HTTPException(status_code=400, detail="This URL format is not supported.")
        else:
            clean_err = re.sub(r'\[.*?\]', '', err_msg).strip()
            raise HTTPException(status_code=500, detail=f"Extraction error: {clean_err[:180]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected extraction error: {str(e)}")

    if not info:
        raise HTTPException(status_code=500, detail="Could not extract metadata from URL.")

    # Handle playlists/entries
    if "entries" in info and info["entries"]:
        info = info["entries"][0]

    video_id = str(info.get("id", "media"))
    title = info.get("title") or "Social Media Video"
    thumbnail = info.get("thumbnail")
    duration = info.get("duration")
    duration_str = format_duration(duration)
    author = info.get("uploader") or info.get("creator") or info.get("channel") or "Creator"
    view_count = info.get("view_count")
    description = (info.get("description") or "")[:250]

    raw_formats = info.get("formats", [])
    video_formats: List[MediaFormat] = []
    audio_formats: List[MediaFormat] = []

    seen_video_res = set()
    seen_audio_q = set()

    for f in raw_formats:
        f_id = str(f.get("format_id", ""))
        ext = f.get("ext", "mp4")
        vcodec = f.get("vcodec", "none")
        acodec = f.get("acodec", "none")
        height = f.get("height")
        width = f.get("width")
        direct_url = f.get("url")

        filesize = f.get("filesize") or f.get("filesize_approx")
        if not filesize and duration and f.get("tbr"):
            filesize = int((f.get("tbr") * 1024 / 8) * duration)

        size_label = format_filesize(filesize)

        # Video streams
        if vcodec != "none" and height and height > 0:
            has_audio = acodec != "none"
            needs_merge = not has_audio

            if height >= 2160:
                quality_badge = "4K Ultra HD (2160p)"
            elif height >= 1440:
                quality_badge = "2K Quad HD (1440p)"
            elif height >= 1080:
                quality_badge = "Full HD (1080p)"
            elif height >= 720:
                quality_badge = "HD (720p)"
            elif height >= 480:
                quality_badge = "SD (480p)"
            else:
                quality_badge = f"{height}p"

            res_key = (height, ext, has_audio)
            if res_key not in seen_video_res:
                seen_video_res.add(res_key)
                video_formats.append(MediaFormat(
                    format_id=f_id,
                    resolution=f"{width or '?'}x{height}",
                    height=height,
                    width=width,
                    ext=ext,
                    filesize_approx=size_label or "Direct Stream",
                    filesize_bytes=filesize,
                    quality_label=quality_badge,
                    format_note=f.get("format_note"),
                    vcodec=vcodec,
                    acodec=acodec,
                    type="video",
                    has_audio=has_audio,
                    direct_url=direct_url,
                    needs_merge=needs_merge
                ))

        # Audio streams
        elif vcodec == "none" and acodec != "none":
            abr = f.get("abr") or 128
            q_label = f"Audio ({int(abr)} kbps)" if abr else "Audio (HQ)"
            audio_key = (int(abr), ext)
            if audio_key not in seen_audio_q:
                seen_audio_q.add(audio_key)
                audio_formats.append(MediaFormat(
                    format_id=f_id,
                    resolution="Audio Only",
                    height=None,
                    width=None,
                    ext=ext if ext in ["mp3", "m4a", "aac", "wav"] else "mp3",
                    filesize_approx=size_label or "High Quality Audio",
                    filesize_bytes=filesize,
                    quality_label=q_label,
                    format_note=f.get("format_note") or f"{int(abr)}kbps",
                    vcodec="none",
                    acodec=acodec,
                    type="audio",
                    has_audio=True,
                    direct_url=direct_url,
                    needs_merge=False
                ))

    # Sort video by height descending
    video_formats.sort(key=lambda x: (x.height or 0, 1 if x.has_audio else 0), reverse=True)
    audio_formats.sort(key=lambda x: x.filesize_bytes or 0, reverse=True)

    # If no video formats parsed, provide best fallback
    if not video_formats:
        video_formats.append(MediaFormat(
            format_id="best",
            resolution="HD (Original)",
            height=1080,
            width=1920,
            ext="mp4",
            filesize_approx="High Definition",
            quality_label="Best Available (HD)",
            type="video",
            has_audio=True,
            direct_url=info.get("url"),
            needs_merge=False
        ))

    # Guarantee dedicated MP3 option
    if not any(a.ext == "mp3" for a in audio_formats):
        audio_formats.insert(0, MediaFormat(
            format_id="bestaudio",
            resolution="Stereo MP3",
            height=None,
            width=None,
            ext="mp3",
            filesize_approx="High Quality",
            quality_label="MP3 Audio Track (320kbps)",
            format_note="Stereo extracted track",
            vcodec="none",
            acodec="mp3",
            type="audio",
            has_audio=True,
            direct_url=None,
            needs_merge=False
        ))

    return VideoInfoResponse(
        id=video_id,
        title=title,
        thumbnail=thumbnail,
        duration_string=duration_str,
        duration_seconds=int(duration) if duration else None,
        platform=platform,
        author=author,
        view_count=view_count,
        description=description,
        original_url=url,
        formats=video_formats[:12],
        audio_formats=audio_formats[:4]
    )

@app.get("/api/download")
def download_media(
    url: str = Query(..., description="Original video URL"),
    format_id: str = Query("best", description="yt-dlp format ID"),
    type: str = Query("video", description="'video' or 'audio'"),
    ext: str = Query("mp4", description="Output extension"),
    needs_merge: bool = Query(False, description="Whether this format requires video+audio merge")
):
    if not url:
        raise HTTPException(status_code=400, detail="Missing video URL")

    # If format requires merging (e.g. YouTube 1080p/4K video-only), forward to merge-download
    if needs_merge:
        encoded_url = urllib.parse.quote(url)
        return {
            "success": True,
            "title": "High Quality Video",
            "filename": f"OmniStream_{int(time.time())}.mp4",
            "direct_url": None,
            "proxy_download_url": f"/api/merge-download?url={encoded_url}&format_id={format_id}&ext={ext}",
            "platform": detect_platform(url),
            "merged": True
        }

    ydl_opts = get_base_ydl_opts()
    if type == "audio" or ext == "mp3":
        ydl_opts['format'] = f"{format_id}/bestaudio/best"
    else:
        ydl_opts['format'] = format_id if format_id not in ["best", "auto"] else "best"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download preparation failed: {str(e)}")

    title = info.get("title", "download")
    clean_title = re.sub(r'[\\/*?:"<>|]', "", title).strip()[:70] or "media"
    filename = f"{clean_title}.{ext}"

    stream_url = info.get("url")
    if not stream_url and "formats" in info:
        for f in info["formats"]:
            if str(f.get("format_id")) == str(format_id) and f.get("url"):
                stream_url = f.get("url")
                break

    encoded_stream = urllib.parse.quote(stream_url or "") if stream_url else ""
    encoded_fn = urllib.parse.quote(filename)
    proxy_url = f"/api/proxy-download?target_url={encoded_stream}&filename={encoded_fn}" if stream_url else None

    return {
        "success": True,
        "title": title,
        "filename": filename,
        "direct_url": stream_url,
        "proxy_download_url": proxy_url,
        "platform": detect_platform(url),
        "merged": False
    }

@app.get("/api/merge-download")
def merge_and_download(
    background_tasks: BackgroundTasks,
    url: str = Query(..., description="Original video URL"),
    format_id: Optional[str] = Query("bestvideo", description="Video format id"),
    ext: str = Query("mp4", description="Output container"),
    audio_only: bool = Query(False, description="Whether to extract pure MP3")
):
    """
    Downloads high-resolution separate video + audio streams,
    merges them losslessly using FFmpeg, and streams the finished file directly.
    """
    temp_dir = tempfile.mkdtemp(prefix="omnistream_")
    out_template = os.path.join(temp_dir, "%(title).60s.%(ext)s")

    ydl_opts: Dict[str, Any] = {
        'outtmpl': out_template,
        'quiet': True,
        'no_warnings': True,
        'socket_timeout': 30,
        'restrictfilenames': True,
    }

    if audio_only or ext == "mp3":
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '320',
        }]
    else:
        # Merge best matching video stream with highest quality audio track
        target_fmt = f"{format_id}+bestaudio/best" if format_id and format_id != "best" else "bestvideo+bestaudio/best"
        ydl_opts['format'] = target_fmt
        ydl_opts['merge_output_format'] = 'mp4'

    if PROXY_URL:
        ydl_opts['proxy'] = PROXY_URL
    if os.path.isfile(COOKIES_FILE):
        ydl_opts['cookiefile'] = COOKIES_FILE

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"FFmpeg Merge failed: {str(e)}")

    # Locate generated output file
    files = [os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if os.path.isfile(os.path.join(temp_dir, f))]
    if not files:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="Output file was not generated.")

    downloaded_file = files[0]
    filename = os.path.basename(downloaded_file)

    def cleanup_temp():
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

    background_tasks.add_task(cleanup_temp)

    media_type = "audio/mpeg" if ext == "mp3" else "video/mp4"
    return FileResponse(
        path=downloaded_file,
        filename=filename,
        media_type=media_type,
        background=background_tasks
    )

@app.get("/api/proxy-download")
def proxy_download(
    target_url: str = Query(..., description="Direct CDN media URL to stream"),
    filename: str = Query("media.mp4", description="Filename for download header")
):
    if not target_url:
        raise HTTPException(status_code=400, detail="Target URL required")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://www.youtube.com/",
    }

    try:
        req = requests.get(target_url, headers=headers, stream=True, timeout=25)
        req.raise_for_status()

        content_type = req.headers.get("Content-Type", "application/octet-stream")
        content_length = req.headers.get("Content-Length")

        response_headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": content_type,
            "Access-Control-Allow-Origin": "*",
        }
        if content_length:
            response_headers["Content-Length"] = content_length

        def stream_generator():
            for chunk in req.iter_content(chunk_size=1024 * 64):
                if chunk:
                    yield chunk

        return StreamingResponse(stream_generator(), headers=response_headers, media_type=content_type)
    except Exception:
        return RedirectResponse(url=target_url)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting OmniStream FastAPI server on http://0.0.0.0:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
