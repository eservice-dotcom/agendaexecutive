export interface MensagemTemplate {
  id: string;
  titulo: string;
  texto: string;
}

export const mensagensPreCadastradas: MensagemTemplate[] = [
  {
    id: "1",
    titulo: "Confirmação de serviço",
    texto: "Olá! Confirmamos o serviço de transporte agendado para o dia {data} às {hora}. Origem: {origem} | Destino: {destino}. Qualquer dúvida, estamos à disposição!",
  },
  {
    id: "2",
    titulo: "Lembrete de viagem",
    texto: "Olá! Lembramos que seu transporte está agendado para amanhã, {data}, às {hora}. Veículo: {veiculo} | Placa: {placa}. Motorista: {motorista}. Aguardamos você!",
  },
  {
    id: "3",
    titulo: "Dados do motorista",
    texto: "Olá! Segue os dados do motorista designado para o seu serviço: Nome: {motorista} | Veículo: {veiculo} | Placa: {placa}. Horário previsto: {hora}.",
  },
  {
    id: "4",
    titulo: "Agradecimento pós-serviço",
    texto: "Olá! Agradecemos por utilizar nossos serviços de transporte. Esperamos que tudo tenha ocorrido bem. Caso precise novamente, estamos à disposição!",
  },
  {
    id: "5",
    titulo: "Alteração de horário",
    texto: "Olá! Informamos que houve uma alteração no horário do seu transporte. Novo horário: {hora}. Origem: {origem} | Destino: {destino}. Pedimos desculpas por qualquer inconveniente.",
  },
  {
    id: "6",
    titulo: "Cancelamento de serviço",
    texto: "Olá! Informamos que o serviço de transporte agendado para {data} às {hora} foi cancelado. Pedimos desculpas pelo transtorno. Qualquer dúvida, entre em contato.",
  },
  {
    id: "7",
    titulo: "Reagendamento",
    texto: "Olá! O serviço de transporte referente à COT {cot} foi reagendado. Nova data: {data} às {hora}. Origem: {origem} | Destino: {destino}. Por favor, confirme o recebimento.",
  },
  {
    id: "8",
    titulo: "Informações de embarque",
    texto: "Olá! Seguem as informações de embarque: Data: {data} | Hora: {hora}. Local: {origem}. Passageiros: {pax}. Veículo: {veiculo} ({placa}). Motorista: {motorista}.",
  },
  {
    id: "9",
    titulo: "Solicitação de confirmação",
    texto: "Olá! Poderia confirmar sua presença no transporte agendado para {data} às {hora}? Origem: {origem} → Destino: {destino}. Aguardamos seu retorno.",
  },
  {
    id: "10",
    titulo: "Atraso no serviço",
    texto: "Olá! Informamos que o transporte agendado para {hora} pode sofrer um pequeno atraso. Pedimos sua compreensão e manteremos você informado. Obrigado!",
  },
  {
    id: "11",
    titulo: "Boas-vindas ao passageiro",
    texto: "Olá! Bem-vindo(a)! Seu transporte está confirmado para {data} às {hora}. Motorista {motorista} estará aguardando em {origem}. Boa viagem!",
  },
  {
    id: "12",
    titulo: "Pesquisa de satisfação",
    texto: "Olá! Gostaríamos de saber como foi sua experiência com nosso serviço de transporte do dia {data}. Sua opinião é muito importante para nós! Avalie de 1 a 5.",
  },
  {
    id: "13",
    titulo: "Envio de cotação",
    texto: "Olá! Segue a cotação {cot} referente ao serviço solicitado: Tipo: {tipo} | Origem: {origem} → Destino: {destino} | PAX: {pax}. Aguardamos sua aprovação.",
  },
  {
    id: "14",
    titulo: "Motorista a caminho",
    texto: "Olá! O motorista {motorista} já está a caminho do local de embarque ({origem}). Veículo: {veiculo} | Placa: {placa}. Previsão de chegada: {hora}.",
  },
  {
    id: "15",
    titulo: "Finalização do serviço",
    texto: "Olá! Informamos que o serviço COT {cot} foi finalizado com sucesso. Passageiros transportados: {pax}. Agradecemos a confiança!",
  },
  {
    id: "16",
    titulo: "Dados do serviço para o motorista",
    texto: "Olá {motorista}! Seguem os dados do serviço: Data: {data} | Hora: {hora} | PAX: {pax} | Voo: {voos} | Origem: {origem} | Destino: {destino}. Qualquer dúvida, entre em contato.",
  },
];
