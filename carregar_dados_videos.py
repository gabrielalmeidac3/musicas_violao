import json
import os
import logging
from yt_dlp import YoutubeDL
from datetime import datetime

# Configura logging
logging.basicConfig(filename='videos_update.log', level=logging.INFO, 
                   format='%(asctime)s - %(levelname)s - %(message)s')

def load_playlist_url():
    try:
        with open('Link Playlist Aulas Músicas.txt', 'r') as file:
            return file.read().strip()
    except FileNotFoundError:
        logging.error("Arquivo 'Link Playlist Aulas Músicas.txt' não encontrado")
        return None

def get_existing_ritmos():
    try:
        with open('ritmos.json', 'r', encoding='utf-8') as file:  # Lê com UTF-8
            return json.load(file)
    except FileNotFoundError:
        return {}

def fetch_videos_data(playlist_url):
    ydl_opts = {'quiet': True, 'extract_flat': False}  # Removido extract_flat para pegar descrição
    try:
        with YoutubeDL(ydl_opts) as ydl:
            playlist = ydl.extract_info(playlist_url, download=False)
            return [{
                'id': video['id'],
                'title': video['title'],
                'description': video.get('description', ''),  # Puxa descrição
                'url': f"https://www.youtube.com/watch?v={video['id']}"
            } for video in playlist['entries']]
    except Exception as e:
        logging.error(f"Erro ao buscar vídeos: {e}")
        return []

def update_videos_json(videos):
    with open('videos.json', 'w', encoding='utf-8') as file:
        json.dump(videos, file, ensure_ascii=False, indent=4)
    logging.info("videos.json atualizado com sucesso")

def update_ritmos_json(videos, existing_ritmos):
    ritmos = {}
    for video in videos:
        video_id = video['id']
        ritmo = existing_ritmos.get(f"{video['title']}:{video_id}", {}).get('ritmo', '')
        ritmos[f"{video['title']}:{video_id}"] = {'ritmo': ritmo}
    
    with open('ritmos.json', 'w', encoding='utf-8') as file:  # Garante UTF-8
        json.dump(ritmos, file, ensure_ascii=False, indent=4)  # Evita escape de acentos
    logging.info("ritmos.json atualizado com sucesso")


def main():
    logging.info("Iniciando atualização de vídeos")
    playlist_url = load_playlist_url()
    if not playlist_url:
        return

    videos = fetch_videos_data(playlist_url)
    if not videos:
        return

    existing_ritmos = get_existing_ritmos()
    update_videos_json(videos)
    update_ritmos_json(videos, existing_ritmos)
    logging.info("Processo concluído")

if __name__ == "__main__":
    main()