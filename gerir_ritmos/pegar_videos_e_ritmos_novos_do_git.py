import os
import subprocess
import shutil
import tempfile

def baixar_arquivos_do_github():
    # Configurações
    repo_url = "https://github.com/gabrielalmeidac3/musicas_violao.git"
    diretorio_atual = os.getcwd()
    script_atual = os.path.basename(__file__)
    arquivos_alvo = ["ritmos.json", "ritmos_encaixe.json", "videos.json", "videos_encaixe.json"]

    # Criar diretório temporário para clonar o repositório
    temp_dir = tempfile.mkdtemp()
    try:
        # Clonar repositório
        subprocess.run(["git", "clone", "--depth", "1", repo_url, temp_dir], check=True)

        # Copiar apenas os arquivos desejados para a pasta atual
        for arquivo in arquivos_alvo:
            arquivo_remoto = os.path.join(temp_dir, arquivo)
            arquivo_local = os.path.join(diretorio_atual, arquivo)
            if os.path.isfile(arquivo_remoto):
                shutil.copy2(arquivo_remoto, arquivo_local)
                print(f"Arquivo {arquivo} baixado e substituído com sucesso.")
            else:
                print(f"Arquivo {arquivo} não encontrado no repositório.")

        print("Download concluído com sucesso!")

    except subprocess.CalledProcessError as e:
        print(f"Erro ao clonar repositório: {e}")
    except Exception as e:
        print(f"Erro durante o download: {e}")

    finally:
        # Limpar diretório temporário
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    baixar_arquivos_do_github()