import json
import os
import logging
from yt_dlp import YoutubeDL
from datetime import datetime

# Configura logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('videos_update.log'),
        logging.StreamHandler()
    ]
)

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
    ydl_opts = {
        'quiet': True,
        'extract_flat': False,
        'cookiefile': 'cookies.txt',
        'no_warnings': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.86 Safari/537.36',
        'geo_bypass': True,
    }
    logging.info("Iniciando busca de vídeo")
    logging.info(f"Opções: {ydl_opts}")
    try:
        with YoutubeDL(ydl_opts) as ydl:
            logging.info("Extraindo informações da playlist")
            playlist = ydl.extract_info(playlist_url, download=False)
            videos = playlist.get('entries', [])
            logging.info(f"Vídeos extraídos: {len(videos)}")
            result = []
            for video in videos:
                result.append({
                    'id': video['id'],
                    'title': video['title'],
                    'description': video.get('description', ''),
                    'url': f"https://www.youtube.com/watch?v={video['id']}"
                })
            return result
    except Exception as e:
        logging.error(f"Erro: {e}")
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
    start_time = datetime.now()
    status = "incompleto"
    try:
        logging.info("Iniciando atualização de vídeos")
        playlist_url = load_playlist_url()
        if not playlist_url:
            raise Exception("URL da playlist não encontrada")
        
        videos = fetch_videos_data(playlist_url)
        if not videos:
            raise Exception("Nenhum vídeo encontrado")
        
        existing_ritmos = get_existing_ritmos()
        update_videos_json(videos)
        update_ritmos_json(videos, existing_ritmos)
        status = "concluído"
        logging.info("Processo concluído")
    except Exception as e:
        logging.error(f"Erro no processo: {e}")
    finally:
        end_time = datetime.now()
        execution_time = end_time - start_time
        total_seconds = int(execution_time.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        if hours > 0:
            tempo_str = f"{hours}h {minutes:02d}m {seconds:02d}s"
        elif minutes > 0:
            tempo_str = f"{minutes} minutos e {seconds:02d} segundos"
        else:
            tempo_str = f"{seconds} segundos"
        log_data = {
            "ultima_atualizacao": end_time.strftime("%Y-%m-%d %H:%M:%S"),
            "iniciada_em": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "tempo_execucao": tempo_str,
            "status": status
        }
        with open('execution_log.json', 'w', encoding='utf-8') as f:
            json.dump(log_data, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    main()