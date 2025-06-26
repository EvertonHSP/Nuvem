from datetime import datetime
import uuid
from marshmallow import Schema, fields
from app.extensions import db
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import relationship
from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, BigInteger, Numeric, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB


# TABELA: usuarios
# -----------------------------------------------------------------------------------------------
class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(Text, nullable=False)
    email = Column(Text, nullable=False, unique=True, index=True)
    senha_hash = Column(Text, nullable=False)
    dois_fatores_ativo = Column(Boolean, default=True)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())
    ultimo_login = Column(DateTime(timezone=True), nullable=True)
    foto_perfil = Column(Text, nullable=True)
    termos_aceitos = Column(Boolean, default=False)
    termos_versao = Column(Text, nullable=True)
    termos_data_aceite = Column(DateTime(timezone=True), nullable=True)
    conta_exclusao_solicitada = Column(Boolean, default=False)
    conta_exclusao_codigo = Column(Text, nullable=True)
    conta_exclusao_data = Column(DateTime(timezone=True), nullable=True)
    quota_armazenamento = Column(BigInteger, default=10737418240)  # 10GB padrão
    armazenamento_utilizado = Column(BigInteger, default=0)
    
    # Relacionamentos
    sessoes = relationship("Sessao", back_populates="usuario", cascade="all, delete")
    logs = relationship("Log", back_populates="usuario", cascade="all, delete")
    codigos_2fa = relationship("Codigo2FA", back_populates="usuario", cascade="all, delete")
    arquivos = relationship("Arquivo", back_populates="usuario", cascade="all, delete")
    backups = relationship("Backup", back_populates="usuario")

# TABELA: sessao
# -----------------------------------------------------------------------------------------------
class Sessao(db.Model):
    __tablename__ = "sessoes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    jwt_token = Column(Text, nullable=False)
    dois_fatores_validado = Column(Boolean, default=False)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())
    data_expiracao = Column(DateTime(timezone=True), nullable=False)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    dispositivo = Column(Text, nullable=True)
    ativa = Column(Boolean, default=True)

    usuario = relationship("Usuario", back_populates="sessoes")

# TABELA: logs
# -----------------------------------------------------------------------------------------------
class LogCategoria(Enum):
    AUTENTICACAO = "Autenticação"
    ARQUIVO = "Arquivo"
    PASTA = "Pasta"
    SISTEMA = "Sistema"
    CONTA = "Conta"
    SEGURANCA = "Segurança"

class LogSeveridade(Enum):
    INFO = "Informação"
    ALERTA = "Alerta"
    ERRO = "Erro"
    CRITICO = "Crítico"

class Log(db.Model):
    __tablename__ = "logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True)
    categoria = Column(Text, nullable=False)  
    severidade = Column(Text, nullable=False)  
    acao = Column(Text, nullable=False)
    detalhe = Column(Text, nullable=True)
    ip_origem = Column(INET, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    metadados = Column(JSONB, nullable=True)  # Armazena dados adicionais em formato JSON

    usuario = relationship("Usuario", back_populates="logs")

# TABELA: 2FA
# -----------------------------------------------------------------------------------------------
class Codigo2FA(db.Model):
    __tablename__ = "doisfatores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    codigo = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    expiracao = Column(DateTime(timezone=True), nullable=False)
    utilizado = Column(Boolean, default=False)
    ip_address = Column(INET, nullable=True)

    usuario = relationship("Usuario", back_populates="codigos_2fa")



# TABELA: pastas
# -----------------------------------------------------------------------------------------------
class Pasta(db.Model):
    __tablename__ = "pastas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    nome = Column(Text, nullable=False)
    id_pasta_pai = Column(UUID(as_uuid=True), ForeignKey("pastas.id", ondelete="CASCADE"), nullable=True)  # Para subpastas
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())
    caminho = Column(Text, nullable=False)  # Ex: "/documentos/trabalho"
    excluida = Column(Boolean, default=False)
    data_exclusao = Column(DateTime(timezone=True), nullable=True)

    # Relacionamentos
    usuario = relationship("Usuario")
    pasta_pai = relationship("Pasta", remote_side=[id])  # Auto-relacionamento para subpastas
    arquivos = relationship("Arquivo", back_populates="pasta", cascade="all, delete")


# TABELA: arquivos
# -----------------------------------------------------------------------------------------------
class Arquivo(db.Model):
    __tablename__ = "arquivos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    nome_criptografado = Column(Text, nullable=False)  # Nome criptografado no sistema de arquivos
    nome_original = Column(Text, nullable=False)      # Nome original do arquivo
    caminho_armazenamento = Column(Text, nullable=False)
    tamanho = Column(BigInteger, nullable=False)  # Em bytes
    tipo_mime = Column(Text, nullable=False)
    publico = Column(Boolean, default=False)
    data_upload = Column(DateTime(timezone=True), server_default=func.now())
    data_modificacao = Column(DateTime(timezone=True), server_default=func.now())
    descricao = Column(Text, nullable=True)
    tags = Column(JSONB, nullable=True)  # Armazena tags em formato JSON
    hash_arquivo = Column(Text, nullable=False)  # Hash para verificação de integridade
    excluido = Column(Boolean, default=False)
    data_exclusao = Column(DateTime(timezone=True), nullable=True)
    id_pasta = Column(UUID(as_uuid=True), ForeignKey("pastas.id", ondelete="CASCADE"), nullable=True)
    
    pasta = relationship("Pasta", back_populates="arquivos")
    usuario = relationship("Usuario", back_populates="arquivos")
    compartilhamentos = relationship("Compartilhamento", back_populates="arquivo", cascade="all, delete")

# TABELA: compartilhamentos
# -----------------------------------------------------------------------------------------------
class Compartilhamento(db.Model):
    __tablename__ = "compartilhamentos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_arquivo = Column(UUID(as_uuid=True), ForeignKey("arquivos.id", ondelete="CASCADE"))
    hash_publico = Column(Text, unique=True, nullable=True)  # Null se for compartilhamento privado
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())
    data_expiracao = Column(DateTime(timezone=True), nullable=True)
    contagem_downloads = Column(BigInteger, default=0)
    senha = Column(Text, nullable=True)  # Hash da senha se necessário
    permissoes = Column(JSONB, nullable=True)  # Pode definir permissões específicas

    arquivo = relationship("Arquivo", back_populates="compartilhamentos")

# TABELA: backups
# -----------------------------------------------------------------------------------------------
class Backup(db.Model):
    __tablename__ = "backups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    tipo = Column(Text, nullable=False)  # 'sistema' ou 'usuario'
    caminho = Column(Text, nullable=False)
    tamanho = Column(BigInteger, nullable=False)
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(Text, nullable=False)  # 'pendente', 'completo', 'falha'
    metadados = Column(JSONB, nullable=True)

    usuario = relationship("Usuario", back_populates="backups")

# TABELA: politicas_sistema
# -----------------------------------------------------------------------------------------------
class PoliticaSistema(db.Model):
    __tablename__ = "politicas_sistema"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    versao_termos = Column(Text, nullable=False)
    conteudo_termos = Column(Text, nullable=False)
    data_atualizacao = Column(DateTime(timezone=True), server_default=func.now())
    ativa = Column(Boolean, default=True)
    tipo_politica = Column(Text, nullable=False)  # 'privacidade', 'uso', 'retencao'
    dias_retencao = Column(BigInteger, default=30)  # Padrão de 30 dias para retenção de dados



    