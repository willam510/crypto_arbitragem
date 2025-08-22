const btnAtualizar = document.getElementById('atualizar');
const resultados = document.getElementById('resultados');

// Função para atualizar os dados da api
async function buscarDados() {
  resultados.innerHTML = 'Buscando oportunidades de arbitragem...';
  try {
    const res = await fetch('http://localhost:3000/arbitragem');
    const oportunidades = await res.json();

    if (!oportunidades.length) {
      resultados.innerHTML = '<p>Nenhuma oportunidade encontrada.</p>';
      return;
    }

    resultados.innerHTML = oportunidades.map(o => `
      <div class="card">
        <h2>${o.ativo}</h2>
        <p><strong>Comprar em:</strong> ${o.comprar_em}</p>
        <p><strong>Vender em:</strong> ${o.vender_em}</p>
        <p><strong>Lucro:</strong> ${o.lucro}</p>
      </div>
    `).join('');
  } catch (e) {
    resultados.innerHTML = '<p>Erro ao buscar oportunidades.</p>';
  }
}

// Evento de clique
btnAtualizar.addEventListener('click', buscarDados);

// Carregar ao abrir
buscarDados();