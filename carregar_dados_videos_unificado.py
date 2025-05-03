import json
import os
import logging
from yt_dlp import YoutubeDL
from datetime import datetime, timezone
import pytz
import sys
import re

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('videos_update.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger()

def load_playlist_url(file_name):
    logger.info(f"Tentando carregar URL de {file_name}")
    try:
        with open(file_name, 'r', encoding='utf-8') as file:
            url = file.read().strip()
            logger.info(f"URL carregada: {url}")
            return url
    except Exception as e:
        logger.error(f"Erro ao ler {file_name}: {e}")
        return None

def get_existing_ritmos(file_name):
    logger.info(f"Carregando ritmos de {file_name}")
    try:
        with open(file_name, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        logger.info(f"{file_name} não encontrado, retornando vazio")
        return {}
    except Exception as e:
        logger.error(f"Erro ao carregar {file_name}: {e}")
        return {}


def fetch_videos_data(playlist_url, file_name):
    is_encaixe = 'Encaixe' in file_name
    print("DEBUG: Arquivo de cookies existe?", os.path.exists('private/cookies.txt'))
    
    # Verificar permissões do arquivo
    import stat
    if os.path.exists('private/cookies.txt'):
        file_stats = os.stat('private/cookies.txt')
        print(f"DEBUG: Permissões do arquivo de cookies: {oct(file_stats.st_mode)}")
        
        # Verificar conteúdo do início do arquivo
        with open('private/cookies.txt', 'r', encoding='utf-8', errors='replace') as f:
            first_line = f.readline().strip()
            print("DEBUG: Primeira linha dos cookies:", first_line)
            # Verificar se o arquivo parece ser um arquivo de cookies netscape/mozilla
            if "# Netscape HTTP Cookie File" in first_line or ".youtube.com" in first_line:
                print("DEBUG: Arquivo de cookies parece estar no formato correto")
            else:
                print("AVISO: Arquivo de cookies pode não estar no formato correto para yt-dlp")
    
class ErrorCatchingLogger:
    def debug(self, msg): 
        if "Sign in to confirm you're not a bot" in msg or "YouTube account cookies are no longer valid" in msg:
            print(f"Erro crítico detectado: {msg}")
            sys.exit(1)
    def warning(self, msg): self.debug(msg)
    def error(self, msg): self.debug(msg)
    def info(self, msg): pass
    
    ydl_opts = {
        'quiet': False,
        'verbose': True,  # Adicionar modo verbose para mais informações de debug
        'progress_with_newline': True,
        'extract_flat': False,
        'cookiefile': 'private/cookies.txt',
        'no_warnings': False,  # Mostrar avisos para ajudar no debug
        'ignoreerrors': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.86 Safari/537.36',
        'geo_bypass': True,
        'playlist_items': None,
        'logger': ErrorCatchingLogger(),
    }

    #se quiser pegar de um item x a item y dentro da playlist, use 'playlist_items': '164-' if not is_encaixe else None

    logger.info(f"Iniciando busca de vídeo {'encaixe' if is_encaixe else 'normal'}")
    logger.info(f"Arquivo: {file_name}")
    logger.info(f"Playlist URL: {playlist_url}")
    logger.info(f"Encaixe detectado: {is_encaixe}")
    logger.info(f"Opções: {ydl_opts}")
    logger.info(f"Playlist items final: {ydl_opts.get('playlist_items', 'Nenhum')}")
    
    try:
        with YoutubeDL(ydl_opts) as ydl:
            logger.info("Extraindo informações da playlist")
            playlist = ydl.extract_info(playlist_url, download=False)
            # Verifique erros na saída
            output_str = str(playlist)
            for pattern in ["The provided YouTube account cookies are no longer valid", "Sign in to confirm you're not a bot"]:
                if pattern in output_str:
                    print(f"Erro detectado: {pattern}")
                    sys.exit(1)  # Saída com código de erro
            logger.info(f"Total vídeos disponíveis: {playlist.get('playlist_count', 0)}")
            videos = playlist.get('entries', [])
            logger.info(f"Total vídeos extraídos: {len(videos)}")
            total_videos = len(videos)
            logger.info(f"Nome da playlist: {playlist.get('title', 'Sem título')}")
            result = []
            for idx, video in enumerate(videos, start=1):
                if not video or 'id' not in video or 'title' not in video:
                    logger.warning(f"Vídeo {idx+(163 if not is_encaixe else 0)} ignorado: Dados inválidos")
                    continue
                logger.info(f"[{idx}/{total_videos}] Extraindo: {video['title']}")
                print(f"[{idx}/{total_videos}] {video['title']}")
                result.append({
                    'id': video['id'],
                    'title': video['title'],
                    'description': video.get('description', ''),
                    'url': f"https://www.youtube.com/watch?v={video['id']}"
                })

            logger.info(f"Vídeos válidos extraídos: {len(result)} de {total_videos}")
            return result, total_videos
    except Exception as e:
        logger.error(f"Erro na extração: {e}")
        return [], 0

def update_json(videos, videos_file, ritmos, ritmos_file):
    logger.info(f"Atualizando {videos_file}")
    with open(videos_file, 'w', encoding='utf-8') as file:
        json.dump(videos, file, ensure_ascii=False, indent=4)

    logger.info(f"Atualizando {ritmos_file}")
    ritmos_data = {}
    for video in videos:
        video_id = video['id']
        ritmo = ritmos.get(f"{video['title']}:{video_id}", {}).get('ritmo', '')
        ritmos_data[f"{video['title']}:{video_id}"] = {'ritmo': ritmo}
    with open(ritmos_file, 'w', encoding='utf-8') as file:
        json.dump(ritmos_data, file, ensure_ascii=False, indent=4)

def main():
    tz_manaus = pytz.timezone('America/Manaus')
    start_time = datetime.now(tz_manaus)
    status = "incompleto"
    videos_encaixe, total_encaixe = [], 0
    try:
        logger.info("Iniciando atualização de vídeos normais")
        playlist_normal = load_playlist_url('Link Playlist Aulas Músicas.txt')
        if playlist_normal:
            videos_normal, total_normal = fetch_videos_data(playlist_normal, 'Link Playlist Aulas Músicas.txt')
            if videos_normal:
                ritmos_normal = get_existing_ritmos('ritmos.json')
                update_json(videos_normal, 'videos.json', ritmos_normal, 'ritmos.json')
                logger.info(f"Arquivo videos.json gerado: {os.path.exists('videos.json')}")
                logger.info(f"Arquivo ritmos.json gerado: {os.path.exists('ritmos.json')}")
            else:
                logger.warning("Nenhum vídeo normal encontrado, continuando...")
        else:
            logger.warning("URL da playlist normal não encontrada, continuando...")        
        logger.info("Iniciando atualização de vídeos encaixe")
        playlist_encaixe = load_playlist_url('Link Playlist Encaixe.txt')
        if playlist_encaixe:
            videos_encaixe, total_encaixe = fetch_videos_data(playlist_encaixe, 'Link Playlist Encaixe.txt')
            if videos_encaixe:
                ritmos_encaixe = get_existing_ritmos('ritmos_encaixe.json')
                update_json(videos_encaixe, 'videos_encaixe.json', ritmos_encaixe, 'ritmos_encaixe.json')
                logger.info(f"Arquivo videos_encaixe.json gerado: {os.path.exists('videos_encaixe.json')}")
                logger.info(f"Arquivo ritmos_encaixe.json gerado: {os.path.exists('ritmos_encaixe.json')}")
            else:
                logger.warning("Nenhum vídeo encaixe encontrado, continuando...")
        else:
            logger.warning("URL da playlist encaixe não encontrada, continuando...")

        status = "concluído" if (videos_normal and len(videos_normal) == total_normal) and (videos_encaixe and len(videos_encaixe) == total_encaixe) else "incompleto"
    except Exception as e:
        logger.error(f"Erro no processo: {e}")
    finally:
        end_time = datetime.now(tz_manaus)
        execution_time = end_time - start_time
        total_seconds = int(execution_time.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        tempo_str = f"{hours}h {minutes:02d}m {seconds:02d}s" if hours > 0 else f"{minutes}m {seconds:02d}s" if minutes > 0 else f"{seconds}s"
        log_data = {
            "ultima_atualizacao": end_time.strftime("%Y-%m-%d %H:%M:%S"),
            "iniciada_em": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "tempo_execucao": tempo_str,
            "status": status
        }
        logger.info(f"Vídeos normais: {len(videos_normal)}/{total_normal}")
        logger.info(f"Vídeos encaixe: {len(videos_encaixe)}/{total_encaixe}")
        logger.info(f"Vídeos atualizados: {len(videos_normal) + len(videos_encaixe)}/{total_normal + total_encaixe}")
        logger.info(f"Total de vídeos extraídos playlist 1: {len(videos_normal)} de {total_normal} ({len(videos_normal)}/{total_normal})")
        logger.info(f"Total de vídeos extraídos playlist 2: {len(videos_encaixe)} de {total_encaixe} ({len(videos_encaixe)}/{total_encaixe})")
        total_extraidos = len(videos_normal) + len(videos_encaixe)
        total_disponiveis = total_normal + total_encaixe
        logger.info(f"Total de vídeos extraídos no total: {total_extraidos} de {total_disponiveis} ({total_extraidos}/{total_disponiveis})")

        with open('execution_log.json', 'w', encoding='utf-8') as f:
            json.dump(log_data, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    main()

input("Pressione Enter para sair...")