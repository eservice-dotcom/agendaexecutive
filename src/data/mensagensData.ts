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
];
