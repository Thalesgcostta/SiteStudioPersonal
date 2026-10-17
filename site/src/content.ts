export const studio = {
  name: "Studio de Personal Katielle Faleiros",
  phone: "(16) 99214-8454",
  whatsapp: "5516992148454",
  instagram: "https://www.instagram.com/katiifaleiros/",
  location: "Franca, São Paulo",
};
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
  equipment: {
    id: "equipment",
    src: "/media/halteres.jpg",
    alt: "Halteres organizados no studio, com iluminação em tons de roxo",
    width: 335,
    height: 597,
  },
  individual: {
    id: "individual",
    src: "/media/acompanhamento-individual.jpg",
    alt: "Katielle acompanha de perto uma aluna durante um exercício no banco",
    width: 335,
    height: 597,
  },
  technique: {
    id: "technique",
    src: "/media/correcao-movimentos.jpg",
    alt: "Katielle orienta um aluno durante um exercício com halter",
    width: 335,
    height: 597,
  },
  together: {
    id: "together",
    src: "/media/treino-acompanhado.jpg",
    alt: "Katielle e um aluno sorrindo durante um exercício de ombros com halteres",
    width: 335,
    height: 597,
  },
  movement: {
    id: "movement",
    src: "/media/tecnica-katielle.jpg",
    alt: "Katielle demonstra um movimento no aparelho do studio",
    width: 335,
    height: 597,
  },
  care: {
    id: "care",
    src: "/media/orientacao-proxima.jpg",
    alt: "Katielle acompanha uma aluna sentada em um aparelho, orientando sua postura",
    width: 335,
    height: 597,
  },
  personal: {
    id: "personal",
    src: "/media/atendimento-personalizado.jpg",
    alt: "Katielle orienta um aluno em um exercício de puxada, com a frase atendimento personalizado na foto",
    width: 335,
    height: 597,
  },
  student: {
    id: "student",
    src: "/media/aluna-em-treino.jpg",
    alt: "Aluna de camiseta rosa praticando um exercício no aparelho do studio",
    width: 335,
    height: 597,
  },
  katielle: {
    id: "katielle",
    src: "/media/katielle-no-studio.jpg",
    alt: "Katielle Faleiros sorrindo e fazendo sinal positivo dentro do studio",
    width: 335,
    height: 597,
  },
  portrait: {
    id: "portrait",
    src: "/media/katielle-retrato.jpg",
    alt: "Retrato de Katielle Faleiros de braços cruzados no studio",
    width: 225,
    height: 225,
  },
  exterior: {
    id: "exterior",
    src: "/media/fachada-studio.jpg",
    alt: "Vista aérea da fachada e da vizinhança do studio em Franca",
    width: 335,
    height: 597,
  },
  community: {
    id: "community",
    src: "/media/comunidade-studio.jpg",
    alt: "Katielle e uma mulher em uma foto de parceria com a comunidade local",
    width: 335,
    height: 597,
  },
  barGuidance: {
    id: "bar-guidance",
    src: "/media/orientacao-na-barra.jpg",
    alt: "Katielle orienta uma aluna durante um exercício com barra no banco do studio",
    width: 720,
    height: 1280,
  },
  benchSupport: {
    id: "bench-support",
    src: "/media/apoio-no-banco.jpg",
    alt: "Katielle acompanha uma aluna deitada no banco durante um exercício com halteres",
    width: 720,
    height: 1280,
  },
  rowing: {
    id: "rowing",
    src: "/media/treino-de-remada.jpg",
    alt: "Katielle demonstra a uma aluna o movimento de remada com apoio no banco",
    width: 720,
    height: 1280,
  },
  cableTraining: {
    id: "cable-training",
    src: "/media/treino-na-polia.jpg",
    alt: "Katielle acompanha um aluno no aparelho de polia, sob a iluminação roxa do studio",
    width: 720,
    height: 1280,
  },
  shoulderTraining: {
    id: "shoulder-training",
    src: "/media/treino-de-ombros.jpg",
    alt: "Katielle supervisiona um aluno no desenvolvimento de ombros com halteres",
    width: 720,
    height: 1280,
  },
  machineCare: {
    id: "machine-care",
    src: "/media/cuidado-no-aparelho.jpg",
    alt: "Katielle orienta uma aluna sentada em um aparelho na área de treinamento",
    width: 720,
    height: 1280,
  },
  movementAdjustment: {
    id: "movement-adjustment",
    src: "/media/ajuste-de-movimento.jpg",
    alt: "Katielle ajuda uma aluna a ajustar o movimento do braço com um halter",
    width: 720,
    height: 1280,
  },
  interior: {
    id: "interior",
    src: "/media/interior-studio.jpg",
    alt: "Interior do studio com aparelhos de musculação e iluminação geométrica em roxo, azul e amarelo",
    width: 720,
    height: 1280,
  },
} satisfies Record<string, Photo>;

export const studioVideo = {
  src: "/media/studio-em-movimento.mp4",
  poster: "/media/studio-video-capa.jpg",
  width: 1024,
  height: 576,
};

export const gallery = [
  {
    photo: photos.barGuidance,
    title: "Orientação que faz a diferença",
    category: "Treinos",
  },
  {
    photo: photos.together,
    title: "Movimento com um sorriso",
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
    photo: photos.benchSupport,
    title: "Apoio em cada etapa",
    category: "Treinos",
  },
  {
    photo: photos.technique,
    title: "Atenção em cada movimento",
    category: "Treinos",
  },
  {
    photo: photos.exterior,
    title: "Nosso espaço em Franca",
    category: "Estrutura",
  },
  { photo: photos.care, title: "Acompanhamento de perto", category: "Treinos" },
  {
    photo: photos.rowing,
    title: "Aprender o movimento, sentir a evolução",
    category: "Treinos",
  },
  {
    photo: photos.student,
    title: "Seu tempo de cuidar de você",
    category: "Treinos",
  },
  {
    photo: photos.machineCare,
    title: "Cuidado que acompanha você",
    category: "Treinos",
  },
  { photo: photos.movement, title: "Técnica na prática", category: "Treinos" },
  {
    photo: photos.equipment,
    title: "Estrutura para o seu treino",
    category: "Estrutura",
  },
  {
    photo: photos.personal,
    title: "Treino individualizado",
    category: "Treinos",
  },
  {
    photo: photos.shoulderTraining,
    title: "Força com acompanhamento",
    category: "Treinos",
  },
  {
    photo: photos.movementAdjustment,
    title: "Os detalhes de um treino bem feito",
    category: "Treinos",
  },
  {
    photo: photos.individual,
    title: "Seu objetivo, nossa atenção",
    category: "Treinos",
  },
  {
    photo: photos.community,
    title: "Conexões da nossa comunidade",
    category: "Comunidade",
  },
];
