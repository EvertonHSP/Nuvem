from flask_restful import Resource, reqparse
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from enum import Enum  # 👈 Adicione esta linha
from app.models import Usuario, Arquivo, Pasta, Log, LogCategoria, LogSeveridade, Sessao
from app.extensions import db
from uuid import uuid4
from datetime import datetime
from flask import request, send_file, abort
from werkzeug.datastructures import FileStorage  # 👈 ADICIONADO
import os
import hashlib
from cryptography.fernet import Fernet
from werkzeug.utils import secure_filename, safe_join 
import json
import mimetypes

def registrar_log(usuario_id, categoria, severidade, acao, detalhe=None, metadados=None, ip_origem=None):
    """
    Registra uma ação no sistema de logs aprimorado
    :param usuario_id: UUID do usuário que realizou a ação
    :param categoria: Categoria do log (usar LogCategoria)
    :param severidade: Nível de severidade (usar LogSeveridade)
    :param acao: Descrição da ação (máx. 255 chars)
    :param detalhe: Detalhes adicionais (opcional)
    :param metadados: Dados adicionais em formato JSON (opcional)
    :param ip_origem: Endereço IP de origem (capturado automaticamente se None)
    """
    if ip_origem is None:
        ip_origem = request.remote_addr
    
    try:
        novo_log = Log(
            id=uuid4(),
            id_usuario=usuario_id,
            categoria=categoria.value if isinstance(categoria, Enum) else categoria,
            severidade=severidade.value if isinstance(severidade, Enum) else severidade,
            acao=acao,
            detalhe=detalhe,
            ip_origem=ip_origem,
            metadados=json.dumps(metadados) if metadados else None
        )
        
        db.session.add(novo_log)
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao registrar log: {str(e)}")
        return False

# Formatos permitidos (pode adicionar mais)
ALLOWED_EXTENSIONS = {
    # Imagens
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff',
    # Documentos
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp',
    # Arquivos compactados
    'zip', 'rar', '7z', 'tar', 'gz',
    # Áudio
    'mp3', 'wav', 'ogg', 'flac', 'aac',
    # Vídeo
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv',
    # Outros
    'csv', 'json', 'xml', 'html', 'htm', 'js', 'css', 'py', 'php'
}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


folder_parser = reqparse.RequestParser()
folder_parser.add_argument('nome', 
                         type=str, 
                         location='json', 
                         required=True, 
                         help='Nome da pasta é obrigatório')
folder_parser.add_argument('pasta_pai_id', 
                         type=str, 
                         location='json', 
                         required=False)

upload_parser = reqparse.RequestParser()
upload_parser.add_argument('file', 
                         type=FileStorage, 
                         location='files', 
                         required=True, 
                         help='Arquivo é obrigatório')
upload_parser.add_argument('is_public', 
                         type=bool, 
                         location='form', 
                         default=False)
upload_parser.add_argument('folder_id', 
                         type=str, 
                         location='form')
upload_parser.add_argument('description', 
                         type=str, 
                         location='form')
upload_parser.add_argument('tags', 
                         type=str, 
                         location='form')

class FileUploadResource(Resource):
    @jwt_required()
    def post(self):
        try:
            # Verifica se o conteúdo é multipart/form-data
            if not request.content_type.startswith('multipart/form-data'):
                return {'message': 'Content-Type deve ser multipart/form-data'}, 415

            current_user_id = get_jwt_identity()
            user = Usuario.query.get(current_user_id)
            if not user:
                return {'message': 'Usuário não encontrado'}, 404

            jti = get_jwt()["jti"]
            sessao = Sessao.query.filter_by(
                id_usuario=current_user_id,
                jwt_token=jti,
                dois_fatores_validado=True  
            ).first()
            if not sessao:
                return {"error": "Sessão não encontrada ou não verificada"}, 401

            

            args = upload_parser.parse_args()
            uploaded_file = args['file']
            
            if not uploaded_file:
                return {'message': 'Nenhum arquivo recebido'}, 400

            # Verifica a extensão do arquivo
            if not allowed_file(uploaded_file.filename):
                return {'message': 'Tipo de arquivo não permitido'}, 400

            # Determina o tamanho do arquivo
            uploaded_file.seek(0, os.SEEK_END)
            file_size = uploaded_file.tell()
            uploaded_file.seek(0)

            if user.armazenamento_utilizado + file_size > user.quota_armazenamento:
                return {'message': 'Quota de armazenamento excedida'}, 400

            # Cria diretório de upload
            upload_dir = os.path.join('uploads', str(user.id))
            os.makedirs(upload_dir, exist_ok=True)

            # Gera nome único para o arquivo
            file_ext = os.path.splitext(uploaded_file.filename)[1].lower()
            unique_filename = f"{uuid4().hex}{file_ext}"
            file_path = os.path.join(upload_dir, unique_filename)

            # Salva o arquivo
            uploaded_file.save(file_path)

            # Calcula hash do arquivo
            file_hash = hashlib.sha256()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    file_hash.update(chunk)

            # Determina o tipo MIME real
            mime_type, _ = mimetypes.guess_type(uploaded_file.filename)
            if not mime_type:
                mime_type = 'application/octet-stream'

            # Cria registro no banco de dados
            new_file = Arquivo(
                id=uuid4(),
                id_usuario=user.id,
                nome_criptografado=unique_filename,
                nome_original=uploaded_file.filename,
                caminho_armazenamento=file_path,
                tamanho=file_size,
                tipo_mime=mime_type,
                publico=args['is_public'],
                descricao=args.get('description'),
                tags=args.get('tags'),
                hash_arquivo=file_hash.hexdigest(),
                id_pasta=args.get('folder_id')
            )

            db.session.add(new_file)
            user.armazenamento_utilizado += file_size
            db.session.commit()

            return {
                'message': 'Upload realizado com sucesso',
                'file_id': str(new_file.id),
                'file_name': uploaded_file.filename,
                'file_size': file_size,
                'mime_type': mime_type
            }, 201

        except Exception as e:
            db.session.rollback()
            # Remove o arquivo em caso de erro
            if 'file_path' in locals() and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except:
                    pass
            
            print(f"ERRO NO UPLOAD: {str(e)}")
            return {
                'message': 'Erro no processamento do arquivo',
                'error': str(e)
            }, 500
        


class FileDownloadResource(Resource):
    @jwt_required()
    def get(self, file_id):
        try:
            current_user_id = get_jwt_identity()
            user = Usuario.query.get(current_user_id)
            jti = get_jwt()["jti"]

            if not user:
                return {'message': 'Usuário não encontrado'}, 404
            
            
            sessao = Sessao.query.filter_by(
                id_usuario=current_user_id,
                jwt_token=jti,
                dois_fatores_validado=True  
            ).first()
        
            if not sessao:
                return {"error": "Sessão não encontrada ou não verificada"}, 401
            
            arquivo = Arquivo.query.filter_by(id=file_id, id_usuario=current_user_id).first()
            
            if not arquivo:
                
                arquivo = Arquivo.query.filter_by(id=file_id, publico=True).first()
                if not arquivo:
                    return {'message': 'Arquivo não encontrado ou acesso negado'}, 404

            
            if not os.path.exists(arquivo.caminho_armazenamento):
                return {'message': 'Arquivo não encontrado no servidor'}, 404

            
            file_hash = hashlib.sha256()
            with open(arquivo.caminho_armazenamento, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    file_hash.update(chunk)
            
            if file_hash.hexdigest() != arquivo.hash_arquivo:
                return {'message': 'Arquivo corrompido'}, 500

           
            registrar_log(
                usuario_id=current_user_id,
                categoria=LogCategoria.ARQUIVO,
                severidade=LogSeveridade.INFO,
                acao='Download de arquivo',
                detalhe=f"Arquivo: {arquivo.nome_original}",
                metadados={
                    'file_id': str(arquivo.id),
                    'file_size': arquivo.tamanho
                },
                ip_origem=request.remote_addr
            )

           
            return send_file(
                arquivo.caminho_armazenamento,
                as_attachment=True,
                download_name=secure_filename(arquivo.nome_original),
                mimetype=arquivo.tipo_mime
            )

        except Exception as e:
            print(f"ERRO NO DOWNLOAD: {str(e)}")
            return {
                'message': 'Erro ao processar download',
                'error': str(e)
            }, 500



class FolderContentResource(Resource):
    @jwt_required()
    def get(self, folder_id=None):
        try:
            current_user_id = get_jwt_identity()
            user = Usuario.query.get(current_user_id)
            
            if not user:
                return {'message': 'Usuário não encontrado'}, 404
            jti = get_jwt()["jti"]
            sessao = Sessao.query.filter_by(
                id_usuario=current_user_id,
                jwt_token=jti,
                dois_fatores_validado=True  
            ).first()
            if not sessao:
                return {"error": "Sessão não encontrada ou não verificada"}, 401

            
            if folder_id is None:
                
                subpastas = Pasta.query.filter_by(
                    id_usuario=current_user_id,
                    id_pasta_pai=None,
                    excluida=False
                ).all()
                
                # Arquivos raiz (onde id_pasta é NULL)
                arquivos = Arquivo.query.filter_by(
                    id_usuario=current_user_id,
                    id_pasta=None,
                    excluido=False
                ).all()
            else:
                # Verifica se a pasta pertence ao usuário
                pasta = Pasta.query.filter_by(
                    id=folder_id,
                    id_usuario=current_user_id,
                    excluida=False
                ).first()
                
                if not pasta:
                    return {'message': 'Pasta não encontrada ou acesso negado'}, 404
                
                # Subpastas desta pasta
                subpastas = Pasta.query.filter_by(
                    id_pasta_pai=folder_id,
                    excluida=False
                ).all()
                
                # Arquivos desta pasta
                arquivos = Arquivo.query.filter_by(
                    id_pasta=folder_id,
                    excluido=False
                ).all()

            # Formata a resposta
            response = {
                'pasta_atual': {
                    'id': str(folder_id) if folder_id else None,
                    'nome': pasta.nome if folder_id else 'Raiz'
                },
                'pastas': [{
                    'id': str(pasta.id),
                    'nome': pasta.nome,
                    'data_criacao': pasta.data_criacao.isoformat(),
                    'quantidade_arquivos': len(pasta.arquivos),
                    'caminho': pasta.caminho
                } for pasta in subpastas],
                'arquivos': [{
                    'id': str(arquivo.id),
                    'nome': arquivo.nome_original,
                    'tamanho': arquivo.tamanho,
                    'tipo': arquivo.tipo_mime,
                    'publico': arquivo.publico,
                    'data_upload': arquivo.data_upload.isoformat(),
                    'descricao': arquivo.descricao,
                    'tags': arquivo.tags,
                    'pasta_id': str(arquivo.id_pasta) if arquivo.id_pasta else None
                } for arquivo in arquivos]
            }

            return response, 200

        except Exception as e:
            print(f"ERRO AO LISTAR CONTEÚDO: {str(e)}")
            return {
                'message': 'Erro ao listar conteúdo da pasta',
                'error': str(e)
            }, 500



class FolderCreateResource(Resource):
    @jwt_required()
    def post(self):
        try:
            current_user_id = get_jwt_identity()
            user = Usuario.query.get(current_user_id)
            
            if not user:
                return {'message': 'Usuário não encontrado'}, 404
            jti = get_jwt()["jti"]
            sessao = Sessao.query.filter_by(
                id_usuario=current_user_id,
                jwt_token=jti,
                dois_fatores_validado=True  
            ).first()
            if not sessao:
                return {"error": "Sessão não encontrada ou não verificada"}, 401


            args = folder_parser.parse_args()
            nome_pasta = args['nome']
            pasta_pai_id = args.get('pasta_pai_id')

       
            if not nome_pasta or len(nome_pasta.strip()) == 0:
                return {'message': 'Nome da pasta não pode ser vazio'}, 400

            
            existing_folder = Pasta.query.filter_by(
                id_usuario=current_user_id,
                id_pasta_pai=pasta_pai_id,
                nome=nome_pasta,
                excluida=False
            ).first()
            
            if existing_folder:
                return {'message': 'Já existe uma pasta com este nome no local especificado'}, 409

          
            pasta_pai = None
            caminho = nome_pasta
            if pasta_pai_id:
                pasta_pai = Pasta.query.filter_by(
                    id=pasta_pai_id,
                    id_usuario=current_user_id,
                    excluida=False
                ).first()
                
                if not pasta_pai:
                    return {'message': 'Pasta pai não encontrada ou acesso negado'}, 404
                
                caminho = f"{pasta_pai.caminho}/{nome_pasta}"

           
            nova_pasta = Pasta(
                id=uuid4(),
                id_usuario=current_user_id,
                nome=nome_pasta,
                id_pasta_pai=pasta_pai_id,
                caminho=caminho,
                excluida=False
            )

            db.session.add(nova_pasta)
            db.session.commit()

            
            registrar_log(
                usuario_id=current_user_id,
                categoria=LogCategoria.PASTA,
                severidade=LogSeveridade.INFO,
                acao='Criação de pasta',
                detalhe=f"Nome: {nome_pasta}",
                metadados={
                    'pasta_id': str(nova_pasta.id),
                    'pasta_pai_id': pasta_pai_id
                },
                ip_origem=request.remote_addr
            )

            return {
                'message': 'Pasta criada com sucesso',
                'pasta': {
                    'id': str(nova_pasta.id),
                    'nome': nova_pasta.nome,
                    'caminho': nova_pasta.caminho,
                    'pasta_pai_id': pasta_pai_id,
                    'data_criacao': nova_pasta.data_criacao.isoformat()
                }
            }, 201

        except Exception as e:
            db.session.rollback()
            print(f"ERRO AO CRIAR PASTA: {str(e)}")
            return {
                'message': 'Erro ao criar pasta',
                'error': str(e)
            }, 500
        



