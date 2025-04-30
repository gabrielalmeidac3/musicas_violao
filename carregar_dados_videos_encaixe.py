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
logger = logging.getLogger()
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(console_handler)

def load_playlist_url():
    logger.info("Tentando carregar URL da playlist")
    if not os.path.exists('Link Playlist encaixe.txt'):
        logger.error("Arquivo 'Link Playlist encaixe.txt' não encontrado")
        return None
    try:
        with open('Link Playlist encaixe.txt', 'r', encoding='utf-8') as file:
            url = file.read().strip()
            logger.info(f"URL carregada: {url}")
            return url
    except Exception as e:
        logger.error(f"Erro ao ler arquivo: {e}")
        return None

def get_existing_ritmos():
    logger.info("Carregando ritmos existentes")
    try:
        with open('ritmos_encaixe.json', 'r', encoding='utf-8') as file:
            ritmos = json.load(file)
            logger.info("Ritmos carregados com sucesso")
            return ritmos
    except FileNotFoundError:
        logger.info("Arquivo ritmos_encaixe.json não encontrado, retornando vazio")
        return {}
    except Exception as e:
        logger.error(f"Erro ao carregar ritmos: {e}")
        return {}

def fetch_videos_data(playlist_url):
    ydl_opts = {
        'quiet': True,
        'extract_flat': False,
        'cookiefile': 'private/cookies.txt',
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
            return result, len(videos)
    except Exception as e:
        logging.error(f"Erro: {e}")
        return []

def update_videos_json(videos):
    logger.info("Atualizando videos_encaixe.json")
    try:
        with open('videos_encaixe.json', 'w', encoding='utf-8') as file:
            json.dump(videos, file, ensure_ascii=False, indent=4)
        logger.info("videos_encaixe.json atualizado com sucesso")
    except Exception as e:
        logger.error(f"Erro ao salvar videos_encaixe.json: {e}")

def update_ritmos_json(videos, existing_ritmos):
    logger.info("Atualizando ritmos_encaixe.json")
    ritmos = {}
    for video in videos:
        video_id = video['id']
        ritmo = existing_ritmos.get(f"{video['title']}:{video_id}", {}).get('ritmo', '')
        ritmos[f"{video['title']}:{video_id}"] = {'ritmo': ritmo}
    
    try:
        with open('ritmos_encaixe.json', 'w', encoding='utf-8') as file:
            json.dump(ritmos, file, ensure_ascii=False, indent=4)
        logger.info("ritmos_encaixe.json atualizado com sucesso")
    except Exception as e:
        logger.error(f"Erro ao salvar ritmos_encaixe.json: {e}")

def main():
    logger.info("Iniciando atualização de vídeos")
    playlist_url = load_playlist_url()
    if not playlist_url:
        logger.error("Nenhuma URL de playlist válida. Encerrando.")
        return

    videos, total_videos = fetch_videos_data(playlist_url)
    if not videos:
        logger.error("Nenhum vídeo encontrado. Encerrando.")
        return

    existing_ritmos = get_existing_ritmos()
    update_videos_json(videos)
    update_ritmos_json(videos, existing_ritmos)
    logger.info(f"Vídeos atualizados: {len(videos)}/{total_videos}")
    logger.info("Processo concluído")

if __name__ == "__main__":
    main()
    input("Pressione Enter para fechar...")