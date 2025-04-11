import os
import subprocess
import logging
import sys

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger()

def run_command(command, logger):
    logger.info(f"Iniciando comando: {command}")
    try:
        result = subprocess.run(command, shell=True, check=True, text=True, capture_output=True)
        logger.info(f"Saída: {result.stdout}")
        logger.info(f"Comando '{command}' concluído com sucesso")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Erro no comando '{command}': {e.stderr}")
        return False

def main():
    logger = setup_logging()
    logger.info("Iniciando processo de upload para o GitHub")

    # Diretório do projeto
    project_dir = r"A:\GABRIEL ALMEIDA - Gestão\Aulas de Violão\SITE TODAS AS AULAS\Site certo"
    logger.info(f"Trocando para diretório: {project_dir}")
    
    try:
        os.chdir(project_dir)
        logger.info(f"Diretório alterado para: {os.getcwd()}")
    except Exception as e:
        logger.error(f"Erro ao acessar diretório: {e}")
        input("Pressione Enter para fechar...")
        return

    # Comandos Git
    commands = [
        ("git init", "Inicializando repositório Git"),
        ("git add .", "Adicionando todos os arquivos"),
        ('git commit -m "Upload inicial do site"', "Fazendo commit dos arquivos"),
        ("git remote add origin https://github.com/gabrielalmeidac3/musicas_violao.git", "Configurando repositório remoto"),
        ("git push -f origin main", "Forçando push para o GitHub")
    ]

    for cmd, desc in commands:
        logger.info(f"Preparando: {desc}")
        if not run_command(cmd, logger):
            logger.error(f"Processo interrompido devido a erro em: {cmd}")
            break
    else:
        logger.info("Todos os comandos executados com sucesso!")
        logger.info("Upload para o GitHub concluído")

    logger.info("Processo finalizado. Verifique o repositório em: https://github.com/gabrielalmeidac3/musicas_violao")
    input("Pressione Enter para fechar...")

if __name__ == "__main__":
    main()