import os
import subprocess
import shutil
import tempfile

def sincronizar_com_github():
    # Configurações
    repo_url = "https://github.com/gabrielalmeidac3/musicas_violao.git"
    diretorio_atual = os.getcwd()
    script_atual = os.path.basename(__file__)
    arquivos_alvo = ["ritmos.json", "ritmos_encaixe.json"]

    # Criar diretório temporário para clonar o repositório
    temp_dir = tempfile.mkdtemp()
    try:
        # Clonar repositório
        subprocess.run(["git", "clone", repo_url, temp_dir], check=True)

        # Copiar apenas os arquivos desejados
        for arquivo in arquivos_alvo:
            arquivo_path = os.path.join(diretorio_atual, arquivo)
            if os.path.isfile(arquivo_path):
                destino = os.path.join(temp_dir, arquivo)
                shutil.copy2(arquivo_path, destino)
            else:
                print(f"Arquivo {arquivo} não encontrado na pasta atual.")

        # Fazer commit e push das alterações
        os.chdir(temp_dir)
        subprocess.run(["git", "add", "ritmos.json", "ritmos_encaixe.json"], check=True)

        try:
            # Tentar fazer o commit (pode falhar se não houver alterações)
            subprocess.run(["git", "commit", "-m", "Atualização automática de ritmos.json e ritmos_encaixe.json"], check=True)
            # Push para o repositório
            subprocess.run(["git", "push", "origin", "main"], check=True)
            print("Sincronização concluída com sucesso!")
        except subprocess.CalledProcessError as e:
            if "nothing to commit" in str(e.output):
                print("Nenhuma alteração detectada nos arquivos.")
            else:
                print(f"Erro ao fazer commit/push: {e}")

    except Exception as e:
        print(f"Erro durante a sincronização: {e}")

    finally:
        # Voltar ao diretório original
        os.chdir(diretorio_atual)
        # Limpar diretório temporário
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    sincronizar_com_github()