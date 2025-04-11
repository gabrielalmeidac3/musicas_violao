import os
import subprocess

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, text=True, capture_output=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Erro: {e.stderr}")
        input("Pressione Enter para fechar...")
        exit(1)

def main():
    # Diretório do projeto
    os.chdir(r"A:\GABRIEL ALMEIDA - Gestão\Aulas de Violão\SITE TODAS AS AULAS\Site certo")
    
    # Comandos Git
    commands = [
        "git init",
        "git add .",
        'git commit -m "Upload inicial do site"',
        "git remote add origin https://github.com/gabrielalmeidac3/musicas_violao.git",
        "git push -f origin main"
    ]
    
    for cmd in commands:
        print(f"Executando: {cmd}")
        run_command(cmd)
    
    print("Upload concluído!")
    input("Pressione Enter para fechar...")

if __name__ == "__main__":
    main()