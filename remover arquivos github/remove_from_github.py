import os
import subprocess
import shutil
import tempfile

def remove_from_github():
    # Configurações
    repo_url = "https://github.com/gabrielalmeidac3/musicas_violao.git"
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Clonar repositório
        subprocess.run(["git", "clone", repo_url, temp_dir], check=True)
        
        # Mudar para o diretório clonado
        os.chdir(temp_dir)
        
        # Itens a remover
        itens_para_remover = [
            "fechado_curso_backup.html",
            "fechado_curso_backup_antes_alteracao.html",
            "subir"
        ]
        
        for item in itens_para_remover:
            if os.path.exists(item):
                if os.path.isdir(item):
                    # Remover pasta recursivamente
                    shutil.rmtree(item)
                else:
                    # Remover arquivo
                    os.remove(item)
                print(f"Removido: {item}")
            else:
                print(f"Item não encontrado: {item}")
        
        # Adicionar mudanças ao Git
        subprocess.run(["git", "add", "."], check=True)
        
        # Commit das mudanças
        subprocess.run(["git", "commit", "-m", "Remove backup files and subir folder from repository"], check=True)
        
        # Push para o repositório
        subprocess.run(["git", "push"], check=True)
        
        print("Remoção concluída e enviada para o repositório!")
    
    except subprocess.CalledProcessError as e:
        print(f"Erro ao executar comando Git: {e}")
    except Exception as e:
        print(f"Erro geral: {e}")
    
    finally:
        # Limpar diretório temporário
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    remove_from_github()
