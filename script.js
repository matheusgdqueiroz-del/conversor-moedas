const valorInput = document.getElementById("valor");
const moedaOrigem = document.getElementById("moeda");
const botaoConverter = document.getElementById("converter");
const resultado = document.getElementById("resultado");
const resultadoContainer = document.getElementById("resultado-container");

const MOEDA_DESTINO = "BRL"; // Deixei o real separado aqui porque o sistema sempre converte pra essa moeda.
const TEXTO_BOTAO = "Converter em reais"; // Guardei o texto original do botão pra não ficar repetindo string no código.

const mensagens = { // Juntei as mensagens num lugar só, fica mais tranquilo de mudar depois se precisar.
  moedaNaoSelecionada: "Selecione uma moeda.",
  valorInvalido: "Digite um valor válido.",
  carregando: "Buscando cotação...",
  erroCotacao: "Erro ao obter cotação. Tente novamente."
};

botaoConverter.addEventListener("click", converterMoeda);

valorInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    converterMoeda();
  }
});

async function converterMoeda() {
  const valor = valorInput.valueAsNumber; // Usei valueAsNumber porque o próprio input já é numérico, então fica mais direto.
  const origem = moedaOrigem.value;

  limparResultado(); // Separei essa limpeza pra função principal ficar mais fácil de ler.

  if (!origem) {
    exibirErro(mensagens.moedaNaoSelecionada); // Peguei a mensagem do objeto pra evitar texto repetido espalhado.
    return;
  }

  if (Number.isNaN(valor) || valor <= 0) { // Troquei por Number.isNaN porque fica mais certinho pra número.
    exibirErro(mensagens.valorInvalido); // Corrigi o acento e deixei a mensagem vindo do mesmo lugar.
    return;
  }

  try {
    mostrarCarregando(); // Criei uma função só pra parte de loading não bagunçar a conversão.

    const cotacao = await buscarCotacao(origem, MOEDA_DESTINO); // Usei a constante da moeda pra ficar claro que o destino é sempre BRL.
    const valorConvertido = valor * cotacao; // Mantive o cálculo simples, só dei um nome bem fácil de entender.

    exibirResultado(valor, origem, valorConvertido); // Coloquei a montagem do resultado em outra função pra organizar melhor.
  } catch (error) {
    exibirErro(mensagens.erroCotacao); // Também deixei o erro usando o objeto de mensagens.
    console.error(error);
  } finally {
    alterarBotao(false); // Aqui eu só volto o botão pro normal, independente se deu certo ou erro.
  }
}

function limparResultado() {
  resultado.classList.remove("resultado-erro"); // Antes isso ficava dentro da conversão, agora a função já diz o que está fazendo.
  resultadoContainer.classList.remove("show"); // Escondo o resultado antigo antes de tentar converter de novo.
}

function mostrarCarregando() {
  resultado.textContent = mensagens.carregando; // Usei a mesma lista de mensagens pra manter o padrão.
  resultadoContainer.classList.add("show"); // Mostro o espaço do resultado enquanto a cotação carrega.
  alterarBotao(true); // Reaproveitei a função do botão pra não repetir disabled e texto.
}

function alterarBotao(convertendo) {
  botaoConverter.disabled = convertendo; // O botão fica travado durante a busca pra evitar vários cliques seguidos.
  botaoConverter.textContent = convertendo ? "Convertendo..." : TEXTO_BOTAO; // Usei ternário porque nesse caso ficou curto e bem legível.
}

function exibirErro(mensagem) {
  resultado.textContent = mensagem;
  resultado.classList.add("resultado-erro");
  resultadoContainer.classList.add("show");
}

function exibirResultado(valor, origem, valorConvertido) {
  const valorOrigemFormatado = formatarMoeda(valor, origem); // Formatei antes pra deixar a linha do HTML mais limpa.
  const valorDestinoFormatado = formatarMoeda(valorConvertido, MOEDA_DESTINO); // Usei a constante de novo pra não escrever BRL solto.

  resultado.innerHTML = `${valorOrigemFormatado} &nbsp;=&nbsp; <strong>${valorDestinoFormatado}</strong>`; // Deixei só a parte visual do resultado aqui.
}

async function buscarCotacao(origem, destino) {
  const cotacaoDireta = await tentarBuscarCotacao(origem, destino); // Primeiro tento do jeito normal, tipo USD-BRL.

  if (cotacaoDireta) {
    return cotacaoDireta; // Se achou direto, já retorna e não precisa fazer mais nada.
  }

  const cotacaoInversa = await tentarBuscarCotacao(destino, origem); // Se não achar, tento o par ao contrário, tipo BRL-USD.

  if (!cotacaoInversa) {
    throw new Error("Cotação não encontrada."); // Corrigi o texto e deixei o erro mais direto.
  }

  return 1 / cotacaoInversa; // Quando vem invertido, divido 1 pela cotação pra chegar no valor certo.
}

async function tentarBuscarCotacao(origem, destino) {
  const parMoedas = `${origem}-${destino}`; // Montei o par numa variável pra URL ficar mais compreensível.
  const chaveCotacao = `${origem}${destino}`; // A API usa a chave sem hífen, então deixei isso separado também.
  const url = `https://economia.awesomeapi.com.br/json/last/${parMoedas}`; // Assim a URL fica usando o par já montado.

  try {
    const resposta = await fetch(url); // Deixei a chamada da API isolada nessa função pra não repetir código.

    if (!resposta.ok) {
      return null; // Se a API não encontrar esse par, volto null e tento outro caminho.
    }

    const dados = await resposta.json(); // Transformo a resposta em JSON do jeito mais comum mesmo.

    if (!dados[chaveCotacao]) {
      return null; // Se a chave não existir, também trato como cotação não encontrada.
    }

    return Number(dados[chaveCotacao].bid); // Retorno só o número da cotação, que é o que a conversão precisa.
  } catch (error) {
    return null; // Se a busca falhar, deixo a outra tentativa acontecer sem quebrar tudo de cara.
  }
}

function formatarMoeda(valor, moeda) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda
  }).format(valor);
}
