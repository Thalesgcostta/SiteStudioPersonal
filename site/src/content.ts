export const studio = {
  name: "Studio de Personal Katielle Faleiros",
  phone: "(16) 99214-8454",
  whatsapp: "5516992148454",
  instagram: "https://www.instagram.com/katiifaleiros/",
  location: "Franca, São Paulo",
  street: "R. Moacir Falaguasta, 2705",
  neighborhood: "Jardim Tropical",
  postalCode: "14407-061",
  address:
    "R. Moacir Falaguasta, 2705 - Jardim Tropical, Franca - SP, 14407-061",
};
export const mapQuery = encodeURIComponent(studio.address);
export const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
export const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&z=17&output=embed`;
export const whatsappLink = (
  message = "Olá, Katielle! Conheci o site do studio e gostaria de agendar uma aula experimental gratuita. Quais horários estão disponíveis?",
) => `https://wa.me/${studio.whatsapp}?text=${encodeURIComponent(message)}`;
export type Photo = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};
export const photos = {
  logo: {
    id: "logo",
    src: "/media/marca-kf.webp",
    alt: "Marca KF Personal Trainer",
    width: 680,
    height: 272,
  },
  katielle: {
    id: "katielle",
    src: "/media/katielle-apresentacao.jpg",
    alt: "Katielle Faleiros sorrindo, de braços cruzados, no studio",
    width: 720,
    height: 1280,
  },
  guidedTraining: {
    id: "guidedTraining",
    src: "/media/orientacao-individual.jpg",
    alt: "Katielle orienta de perto uma aluna durante o exercício com barra na polia",
    width: 2336,
    height: 4160,
  },
  barTraining: {
    id: "barTraining",
    src: "/media/acompanhamento-no-supino.jpg",
    alt: "Katielle acompanha uma aluna no supino com barra",
    width: 718,
    height: 1280,
  },
  shoulderTraining: {
    id: "shoulderTraining",
    src: "/media/orientacao-com-halteres.jpg",
    alt: "Katielle orienta um aluno no desenvolvimento de ombros com halteres",
    width: 720,
    height: 1280,
  },
  cableTraining: {
    id: "cableTraining",
    src: "/media/atencao-na-puxada.jpg",
    alt: "Katielle acompanha uma aluna na puxada, sob a iluminação roxa do studio",
    width: 720,
    height: 1280,
  },
  benchTraining: {
    id: "benchTraining",
    src: "/media/treino-no-banco.jpg",
    alt: "Katielle orienta uma aluna durante o exercício com halteres no banco",
    width: 720,
    height: 1280,
  },
  machineCare: {
    id: "machineCare",
    src: "/media/cuidado-na-maquina.jpg",
    alt: "Katielle orienta a postura de uma aluna sentada no aparelho",
    width: 720,
    height: 1280,
  },
  movementCare: {
    id: "movementCare",
    src: "/media/ajuste-na-elevacao.jpg",
    alt: "Katielle acompanha uma aluna durante uma elevação de braços com halteres",
    width: 720,
    height: 1280,
  },
  individual: {
    id: "individual",
    src: "/media/atendimento-na-polia.jpg",
    alt: "Katielle acompanha uma aluna e orienta o movimento no aparelho de polia",
    width: 720,
    height: 1280,
  },
  technique: {
    id: "technique",
    src: "/media/tecnica-no-movimento.jpg",
    alt: "Aluna realiza um movimento de braços sob a orientação próxima de Katielle",
    width: 720,
    height: 1280,
  },
  rowing: {
    id: "rowing",
    src: "/media/treino-de-remada-novo.jpg",
    alt: "Katielle orienta uma aluna durante a remada com apoio no banco",
    width: 720,
    height: 1280,
  },
  interior: {
    id: "interior",
    src: "/media/studio-vista-ampla.jpg",
    alt: "Vista ampla do studio com aparelhos, alunos e iluminação geométrica amarela",
    width: 1280,
    height: 720,
  },
  ambient: {
    id: "ambient",
    src: "/media/studio-iluminacao.jpg",
    alt: "Vista panorâmica dos aparelhos do studio com iluminação roxa",
    width: 1280,
    height: 720,
  },
  equipment: {
    id: "equipment",
    src: "/media/halteres-do-studio.jpg",
    alt: "Halteres organizados em diferentes pesos na área de musculação do studio",
    width: 854,
    height: 1280,
  },
  weights: {
    id: "weights",
    src: "/media/estrutura-anilhas.jpg",
    alt: "Anilhas organizadas no studio sob iluminação geométrica amarela e roxa",
    width: 720,
    height: 1280,
  },
  machines: {
    id: "machines",
    src: "/media/estrutura-aparelhos.jpg",
    alt: "Aparelhos de musculação e anilhas na área de treinamento do studio",
    width: 720,
    height: 1280,
  },
} satisfies Record<string, Photo>;

export const studioVideo = {
  src: "/media/studio-em-movimento.mp4",
  poster: "/media/studio-vista-ampla.jpg",
  width: 1024,
  height: 576,
};

export const gallery = [
  {
    photo: photos.guidedTraining,
    title: "Seu objetivo, nossa atenção",
    category: "Treinos",
  },
  {
    photo: photos.shoulderTraining,
    title: "Força com acompanhamento",
    category: "Treinos",
  },
  {
    photo: photos.interior,
    title: "Por dentro do nosso studio",
    category: "Estrutura",
  },
  {
    photo: photos.cableTraining,
    title: "Você no centro do treino",
    category: "Treinos",
  },
  {
    photo: photos.benchTraining,
    title: "Apoio em cada etapa",
    category: "Treinos",
  },
  {
    photo: photos.ambient,
    title: "Um ambiente para cuidar de você",
    category: "Estrutura",
  },
  {
    photo: photos.machineCare,
    title: "Acompanhamento de perto",
    category: "Treinos",
  },
  {
    photo: photos.rowing,
    title: "Aprender o movimento, sentir a evolução",
    category: "Treinos",
  },
  {
    photo: photos.equipment,
    title: "Estrutura para o seu treino",
    category: "Estrutura",
  },
  {
    photo: photos.movementCare,
    title: "Os detalhes de um treino bem feito",
    category: "Treinos",
  },
  {
    photo: photos.weights,
    title: "Cada peso, uma nova conquista",
    category: "Estrutura",
  },
  {
    photo: photos.barTraining,
    title: "Técnica e segurança no supino",
    category: "Treinos",
  },
  {
    photo: photos.individual,
    title: "Treino individualizado",
    category: "Treinos",
  },
  {
    photo: photos.machines,
    title: "Espaço para o seu movimento",
    category: "Estrutura",
  },
  {
    photo: photos.technique,
    title: "Correção em cada movimento",
    category: "Treinos",
  },
  {
    photo: photos.katielle,
    title: "Conheça Katielle Faleiros",
    category: "A personal",
  },
];
