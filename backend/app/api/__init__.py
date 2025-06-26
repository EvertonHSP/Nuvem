from flask import Blueprint
from flask_restful import Api
from app.api.auth import (
    RegisterResource,
    LoginResource,
    LogoutResource,
    VerificarCodigo2FAResource,
    VerificarLogin2FAResource,
    ConfirmarExclusaoContaResource,
    ExcluirContaResource,
    UserProfileResource
)
from app.api.file import (
    FileUploadResource,
    FileDownloadResource,
    FolderContentResource,
    FolderCreateResource,
)
from app.api.termo import (
    TermosUsoResource, 
    VerificarTermosResource
)

api_bp = Blueprint('api', __name__, url_prefix='/api')  
api = Api(api_bp)

# Rotas de autenticação
api.add_resource(RegisterResource, '/auth/register')
api.add_resource(VerificarCodigo2FAResource, '/auth/verify-register')
api.add_resource(LoginResource, '/auth/login')
api.add_resource(VerificarLogin2FAResource, '/auth/verify-login')
api.add_resource(LogoutResource, '/auth/logout')
api.add_resource(UserProfileResource, '/auth/me')
api.add_resource(ExcluirContaResource, '/auth/excluir')
api.add_resource(ConfirmarExclusaoContaResource, '/auth/confirmar-exclusao')

#Rotas de Upload e download
api.add_resource(FileUploadResource, '/files/upload')
api.add_resource(FolderCreateResource, '/pastas/create')
api.add_resource(FileDownloadResource, '/files/download/<uuid:file_id>')
api.add_resource(FolderContentResource, 
                 '/folders', 
                 '/folders/<uuid:folder_id>')

#termo de uso
api.add_resource(TermosUsoResource, '/termos')
api.add_resource(VerificarTermosResource, '/termos/verificar')

def init_app(app):
    """Função de inicialização que deve ser importada no app/__init__.py"""
    app.register_blueprint(api_bp)