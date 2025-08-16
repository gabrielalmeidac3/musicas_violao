#!/usr/bin/env python3
"""
Script para iniciar um servidor HTTP local automaticamente
Encontra uma porta disponível a partir da 8000 e abre o navegador
"""

import socket
import webbrowser
import http.server
import socketserver
import os
import sys
import threading
import time
from functools import partial
import select
import msvcrt  # Para Windows

def encontrar_porta_disponivel(porta_inicial=8000, max_tentativas=100):
    """
    Encontra uma porta disponível a partir da porta inicial
    """
    for porta in range(porta_inicial, porta_inicial + max_tentativas):
        try:
            # Testa se a porta está disponível
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            resultado = sock.connect_ex(('localhost', porta))
            sock.close()
            
            if resultado != 0:  # Porta não está em uso
                return porta
        except Exception:
            continue
    
    return None

def verificar_index_html():
    """
    Verifica se existe um arquivo index.html na pasta atual
    """
    pasta_atual = os.getcwd()
    index_path = os.path.join(pasta_atual, 'index.html')
    
    if not os.path.exists(index_path):
        print(f"⚠️  Arquivo 'index.html' não encontrado em: {pasta_atual}")
        resposta = input("Deseja criar um arquivo index.html básico? (s/n): ")
        
        if resposta.lower() in ['s', 'sim', 'y', 'yes']:
            criar_index_basico(index_path)
        else:
            print("Servidor será iniciado sem index.html específico.")
    
    return os.path.exists(index_path)

def criar_index_basico(caminho):
    """
    Cria um arquivo index.html básico
    """
    html_basico = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Servidor Local</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .info {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #17a2b8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Servidor Local Ativo!</h1>
        <div class="info">
            <p><strong>Pasta servida:</strong> """ + os.getcwd() + """</p>
            <p><strong>Status:</strong> Servidor funcionando perfeitamente!</p>
            <p>Você pode substituir este arquivo index.html pelo seu conteúdo.</p>
        </div>
    </div>
</body>
</html>"""
    
    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(html_basico)
    print(f"✅ Arquivo index.html criado em: {caminho}")

def controlar_servidor(httpd):
    """
    Controla o servidor com comandos de teclado
    """
    print("\n📋 DIGITE COMANDOS:")
    print("  'p' = Pausar servidor")
    print("  'r' = Reiniciar em nova porta") 
    print("  'q' = Sair")
    print("  Ctrl+C = Parar servidor")
    print("⌨️  Aguardando comando...")
    
    while True:
        try:
            comando = input(">>> ").lower().strip()
            
            if comando == 'p':
                print("⏸️  Parando servidor...")
                httpd.shutdown()
                return 'parar'
            elif comando == 'r':
                nova_porta = input("🔢 Digite a nova porta (ou Enter para próxima disponível): ").strip()
                if nova_porta.isdigit():
                    porta_escolhida = int(nova_porta)
                else:
                    porta_escolhida = None
                print("🔄 Reiniciando...")
                httpd.shutdown()
                return ('reiniciar', porta_escolhida)
            elif comando == 'q':
                print("🚪 Saindo...")
                httpd.shutdown()
                return 'sair'
            elif comando == '':
                continue
            else:
                print("❌ Use: p, r, ou q")
        except (EOFError, KeyboardInterrupt):
            return 'sair'

def abrir_navegador(url, delay=2):
    """
    Abre o navegador após um pequeno delay para garantir que o servidor iniciou
    """
    time.sleep(delay)
    print(f"🌐 Abrindo navegador: {url}")
    webbrowser.open(url)

class UTF8HTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.endswith('.html') or self.path == '/':
            self.send_header('Content-Type', 'text/html; charset=utf-8')
        super().end_headers()
    
    def guess_type(self, path):
        result = super().guess_type(path)
        if isinstance(result, tuple):
            mimetype = result[0]
        else:
            mimetype = result
        
        if mimetype and mimetype.startswith('text/'):
            return mimetype + '; charset=utf-8'
        return mimetype

def iniciar_servidor(porta_inicial=8000):
    """
    Função principal que inicia o servidor
    """
    print("🔍 Procurando porta disponível...")
    
    # Encontra uma porta disponível
    porta = encontrar_porta_disponivel(porta_inicial)
    
    if porta is None:
        print("❌ Erro: Não foi possível encontrar uma porta disponível.")
        return
    
    print(f"✅ Porta {porta} encontrada e disponível!")
    
    # Verifica se existe index.html
    verificar_index_html()
    
    # Configura o servidor
    pasta_atual = os.getcwd()
    os.chdir(pasta_atual)  # Garante que estamos na pasta correta
    
    # Cria o handler do servidor HTTP
    handler = UTF8HTTPRequestHandler
    
    try:
        # Inicia o servidor
        with socketserver.TCPServer(("", porta), handler) as httpd:
            url = f"http://localhost:{porta}"
            
            print(f"🚀 Servidor iniciado com sucesso!")
            print(f"📁 Pasta servida: {pasta_atual}")
            print(f"🌐 URL: {url}")
            print(f"⏹️  Pressione Ctrl+C para parar o servidor")
            print("-" * 50)
            
            # Abre o navegador em uma thread separada
            browser_thread = threading.Thread(target=abrir_navegador, args=(url,))
            browser_thread.daemon = True
            browser_thread.start()

            # Sistema mais simples - só mantém servidor rodando
            try:
                print("\n💡 DICA: Use Ctrl+C para parar e depois escolher nova porta")
                httpd.serve_forever()
            except KeyboardInterrupt:
                resposta = input("\n🔄 Reiniciar em nova porta? (s/n): ").lower()
                if resposta in ['s', 'sim', 'y', 'yes']:
                    nova_porta = input("🔢 Digite a porta (ou Enter para próxima): ").strip()
                    if nova_porta.isdigit():
                        return ('reiniciar', int(nova_porta))
                    else:
                        return ('reiniciar', porta + 1)
                return ('sair', None)
            
    except KeyboardInterrupt:
        print("\n🛑 Servidor interrompido pelo usuário.")
    except Exception as e:
        print(f"❌ Erro ao iniciar servidor: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("🐍 SERVIDOR LOCAL AUTOMÁTICO")
    print("=" * 50)
    
    porta_atual = 8000
    
    while True:
        try:
            resultado = iniciar_servidor(porta_atual)
            if isinstance(resultado, tuple) and resultado[0] == 'reiniciar':
                porta_atual = resultado[1] if resultado[1] else porta_atual + 1
                print(f"🔄 Reiniciando na porta {porta_atual}...")
                continue
            break
        except KeyboardInterrupt:
            print("\n👋 Servidor finalizado.")
            break
        except Exception as e:
            print(f"❌ Erro inesperado: {e}")
            break
    
    input("\nPressione Enter para sair...")