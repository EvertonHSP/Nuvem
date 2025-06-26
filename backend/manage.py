from app import create_app
from app.extensions import db, socketio
from app.api.termo import check_terms_version 

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        new_version = check_terms_version()
        if new_version:
            print(f'[✓] Termos de uso atualizados para versão {new_version}')

    app.run(
        ssl_context=('localhost+2.pem', 'localhost+2-key.pem'),
        debug=True,
        host='0.0.0.0',
        port=5000
    )
