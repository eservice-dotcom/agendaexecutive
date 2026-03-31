
CREATE SEQUENCE IF NOT EXISTS contratos_numero_seq START WITH 1;

CREATE TABLE public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  numero_contrato INTEGER NOT NULL DEFAULT nextval('contratos_numero_seq'::regclass),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  contratante_nome TEXT NOT NULL DEFAULT '',
  contratante_cnpj_cpf TEXT NOT NULL DEFAULT '',
  contratante_inscricao TEXT NOT NULL DEFAULT '',
  contratante_endereco TEXT NOT NULL DEFAULT '',
  contratante_cidade TEXT NOT NULL DEFAULT '',
  contratante_uf TEXT NOT NULL DEFAULT '',
  contratante_cep TEXT NOT NULL DEFAULT '',
  contratante_telefone TEXT NOT NULL DEFAULT '',
  contratante_email TEXT NOT NULL DEFAULT '',
  contratante_contato TEXT NOT NULL DEFAULT '',
  veiculo_tipo TEXT NOT NULL DEFAULT '',
  veiculo_modelo TEXT NOT NULL DEFAULT '',
  veiculo_placa TEXT NOT NULL DEFAULT '',
  veiculo_ano TEXT NOT NULL DEFAULT '',
  veiculo_cor TEXT NOT NULL DEFAULT '',
  veiculo_capacidade TEXT NOT NULL DEFAULT '',
  veiculo_acessorios TEXT NOT NULL DEFAULT '',
  tipo_servico TEXT NOT NULL DEFAULT '',
  forma_contratacao TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT '',
  destino TEXT NOT NULL DEFAULT '',
  paradas TEXT NOT NULL DEFAULT '',
  data_inicio DATE,
  hora_inicio TEXT NOT NULL DEFAULT '',
  data_fim DATE,
  hora_fim TEXT NOT NULL DEFAULT '',
  duracao_estimada TEXT NOT NULL DEFAULT '',
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_unitario TEXT NOT NULL DEFAULT '',
  km_excedente TEXT NOT NULL DEFAULT '',
  hora_extra TEXT NOT NULL DEFAULT '',
  estacionamento_pedagio TEXT NOT NULL DEFAULT '',
  alimentacao_motorista TEXT NOT NULL DEFAULT '',
  outros_extras TEXT NOT NULL DEFAULT '',
  forma_faturamento TEXT NOT NULL DEFAULT '',
  condicao_pagamento TEXT NOT NULL DEFAULT '',
  data_vencimento DATE,
  dados_faturamento TEXT NOT NULL DEFAULT '',
  antecedencia_cancelamento TEXT NOT NULL DEFAULT '24',
  multa_cancelamento TEXT NOT NULL DEFAULT '50',
  observacoes TEXT NOT NULL DEFAULT '',
  foro_comarca TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all contratos" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contratos" ON public.contratos FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update contratos" ON public.contratos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contratos" ON public.contratos FOR DELETE TO authenticated USING (true);
