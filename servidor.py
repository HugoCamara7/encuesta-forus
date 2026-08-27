"""
SERVIDOR DE PRUEBA LOCAL
========================
Sirve para probar la aplicacion en esta PC antes de publicarla.

Como usarlo:
    1. Doble clic en este archivo, o abrir una terminal aqui y escribir:
           python servidor.py
    2. Se abre solo el navegador en http://localhost:8000

Para cerrarlo: Ctrl + C, o simplemente cierra la ventana negra.

NOTA: esto es solo para probar en la PC. Para instalar la app en las
tablets hay que publicarla en internet una vez (ver LEEME.md).
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PUERTO = 8000


class Manejador(http.server.SimpleHTTPRequestHandler):

    # Sin cache: asi los cambios que hagas se ven al recargar
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    # Menos ruido en la consola
    def log_message(self, formato, *args):
        if '200' not in (args[1] if len(args) > 1 else ''):
            super().log_message(formato, *args)


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    if not os.path.exists('index.html'):
        print('ERROR: no encuentro index.html.')
        print('Este archivo debe estar en la misma carpeta que la aplicacion.')
        input('\nEnter para cerrar...')
        return 1

    # Se permite reutilizar el puerto si quedo ocupado por una prueba anterior
    socketserver.TCPServer.allow_reuse_address = True

    try:
        servidor = socketserver.TCPServer(('127.0.0.1', PUERTO), Manejador)
    except OSError:
        print('El puerto %d esta ocupado.' % PUERTO)
        print('Cierra la otra ventana del servidor y vuelve a intentar.')
        input('\nEnter para cerrar...')
        return 1

    url = 'http://localhost:%d' % PUERTO
    print('=' * 58)
    print('  Servidor de prueba en marcha')
    print('  Abre:  %s' % url)
    print('  Para detenerlo: Ctrl + C')
    print('=' * 58)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print('\nServidor detenido.')
    finally:
        servidor.server_close()

    return 0


if __name__ == '__main__':
    sys.exit(main())
