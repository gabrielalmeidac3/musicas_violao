import os
import subprocess
import shutil
import tempfile

def sincronizar_com_github():
    # Configurações
    repo_url = "https://github.com/gabrielalmeidac3/musicas_violao.git"
    diretorio_atual = os.getcwd()
    script_atual = os.path.basename(__file__)
    
    # Criar diretório temporário para clonar o repositório
    temp_dir = tempfile.mkdtemp()
    try:
        # Clonar repositório
        subprocess.run(["git", "clone", repo_url, temp_dir], check=True)
        
        # Comparar arquivos e sincronizar
        for arquivo in os.listdir(diretorio_atual):
            # Ignorar o script atual e pastas .git
            if arquivo == script_atual or arquivo == ".git":
                continue
            
            # Se é um arquivo, copiar para o repositório temporário
            if os.path.isfile(os.path.join(diretorio_atual, arquivo)):
                destino = os.path.join(temp_dir, arquivo)
                shutil.copy2(os.path.join(diretorio_atual, arquivo), destino)
            else:
                # Se é um diretório, copiar recursivamente
                if os.path.isdir(os.path.join(diretorio_atual, arquivo)):
                    shutil.copytree(os.path.join(diretorio_atual, arquivo), 
                                   os.path.join(temp_dir, arquivo), dirs_exist_ok=True)
        
        # Fazer commit e push das alterações
        os.chdir(temp_dir)
        subprocess.run(["git", "add", "."], check=True)
        
        try:
            # Tentar fazer o commit (pode falhar se não houver alterações)
            subprocess.run(["git", "commit", "-m", "Atualização automática de arquivos"], check=True)
            # Push para o repositório
            subprocess.run(["git", "push"], check=True)
            print("Sincronização concluída com sucesso!")
        except subprocess.CalledProcessError:
            print("Nenhuma alteração detectada ou erro ao fazer commit/push.")
    
    except Exception as e:
        print(f"Erro durante a sincronização: {e}")
    
    finally:
        # Voltar ao diretório original
        os.chdir(diretorio_atual)
        # Limpar diretório temporário
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    sincronizar_com_github()