const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { getOrderBooks } = require('./exchanges.js');
const app = express();
const PORT = 3000;

app.use(cors());

// Lista de ativos monitorados
const ativos = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'MATIC', 'AVAX', 'SHIB', 'TRX',
  'LINK', 'LTC', 'ATOM', 'UNI', 'XLM', 'NEAR', 'APT', 'FTM', 'RNDR', 'INJ', 'OP', 'ARB',
  'PORTO', 'PSG', 'CITY', 'LAZIO', 'SANTOS', 'BAR', 'JUV', 'ASR', 'ACM', 'OG', 'ALPINE'
];

// Mapeamento de símbolos para exchanges brasileiras
const mbSymbols = {
  BTC: 'btc', ETH: 'eth', XRP: 'xrp', LTC: 'ltc', BCH: 'bch', USDT: 'usdt'
};
const brasilBitcoinSymbols = {
  BTC: 'BTC', ETH: 'ETH', XRP: 'XRP', LTC: 'LTC', BCH: 'BCH', USDT: 'USDT'
};
const foxbitSymbols = {
  BTC: 'BTC', ETH: 'ETH', XRP: 'XRP', LTC: 'LTC', BCH: 'BCH', USDT: 'USDT'
};

// URLs das APIs das exchanges (com checagem de símbolo)
const exchanges = {
  Binance: id => `https://api.binance.com/api/v3/ticker/price?symbol=${id}USDT`,
  KuCoin: id => `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${id}-USDT`,
  GateIO: id => `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${id}_USDT`,
  Bybit: id => `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${id}USDT`,
  Bitget: id => `https://api.bitget.com/api/spot/v1/market/ticker?symbol=${id}USDT`,
  OKX: id => `https://www.okx.com/api/v5/market/ticker?instId=${id}-USDT`,
  MercadoBitcoin: id => mbSymbols[id] ? `https://api.mercadobitcoin.net/api/${mbSymbols[id]}/ticker/` : null,
  BrasilBitcoin: id => brasilBitcoinSymbols[id] ? `https://brasilbitcoin.com.br/api/v1/public/ticker/${brasilBitcoinSymbols[id]}` : null,
  Foxbit: id => foxbitSymbols[id] ? `https://api.foxbit.com.br/v1/ticker/${foxbitSymbols[id]}` : null
};

// Função para buscar preços em todas as exchanges para um ativo
async function buscarPrecos(ativo) {
  const promessas = Object.entries(exchanges).map(async ([nome, urlFunc]) => {
    try {
      const url = urlFunc(ativo);
      if (!url) return { exchange: nome, preco: null }; // Pula se não houver símbolo

      const res = await axios.get(url);

      let preco;
      // Cada exchange tem um formato diferente de resposta
      switch(nome) {
        case 'Binance':
          preco = parseFloat(res.data.price);
          break;
        case 'KuCoin':
          preco = parseFloat(res.data.data.price);
          break;
        case 'GateIO':
          const gateData = res.data.find(p => p.currency_pair === `${ativo}_USDT`);
          preco = gateData ? parseFloat(gateData.last) : null;
          break;
        case 'Bybit':
          preco = parseFloat(res.data.result.list[0].lastPrice);
          break;
        case 'Bitget':
          // Bitget pode retornar erro ou array vazio
          preco = res.data.data && res.data.data.last ? parseFloat(res.data.data.last) : null;
          break;
        case 'OKX':
          preco = parseFloat(res.data.data[0].last);
          break;
        case 'MercadoBitcoin':
          preco = parseFloat(res.data.ticker.last);
          break;
        case 'BrasilBitcoin':
          preco = parseFloat(res.data.last);
          break;
        case 'Foxbit':
          preco = parseFloat(res.data.last);
          break;
        default:
          preco = null;
      }

      return { exchange: nome, preco };
    } catch (err) {
      // Log detalhado para facilitar debug
      console.error(`Erro ao buscar preço de ${ativo} na ${nome}:`, err.message);
      return { exchange: nome, preco: null };
    }
  });

  return Promise.all(promessas);
}

// Função para buscar o livro de ordens da Binance (5 linhas)
async function buscarOrderBookBinance(ativo) {
  try {
    const symbol = `${ativo}USDT`;
    const url = `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=5`;
    const res = await axios.get(url);

    // bids = ordens de compra, asks = ordens de venda
    const bids = res.data.bids.map(([preco, quantidade]) => ({
      preco: parseFloat(preco),
      quantidade: parseFloat(quantidade)
    }));

    const asks = res.data.asks.map(([preco, quantidade]) => ({
      preco: parseFloat(preco),
      quantidade: parseFloat(quantidade)
    }));

    return { bids, asks };
  } catch (err) {
    console.error(`Erro ao buscar order book na Binance:`, err.message);
    return { bids: [], asks: [] };
  }
}

// Rota principal para buscar oportunidades de arbitragem
app.get('/arbitragem', async (req, res) => {
  try {
    const resultados = await Promise.all(
      ativos.map(async ativo => {
        const precos = await buscarPrecos(ativo);
        const validos = precos.filter(p => p.preco !== null);

        if (validos.length >= 2) {
          const menor = validos.reduce((a, b) => a.preco < b.preco ? a : b);
          const maior = validos.reduce((a, b) => a.preco > b.preco ? a : b);
          const lucro = ((maior.preco - menor.preco) / menor.preco) * 100;

          return {
            ativo,
            comprar_em: menor.exchange,
            vender_em: maior.exchange,
            lucro: lucro.toFixed(2) + '%',
          };
        }
        return null;
      })
    );

    const oportunidades = resultados.filter(o => o !== null);

    res.json(oportunidades);
  } catch (error) {
    console.error('Erro na rota /arbitragem:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar oportunidades de arbitragem.' });
  }
});

// Nova rota para buscar o livro de ordens de uma exchange específica
app.get('/orderbook/:ativo/:exchange', async (req, res) => {
  const { ativo, exchange } = req.params;
  try {
    const book = await getOrderBooks(ativo.toUpperCase(), exchange);
    res.json({
      bids: book.bids.slice(0, 5).map(([preco, quantidade]) => ({
        preco: parseFloat(preco),
        quantidade: parseFloat(quantidade)
      })),
      asks: book.asks.slice(0, 5).map(([preco, quantidade]) => ({
        preco: parseFloat(preco),
        quantidade: parseFloat(quantidade)
      }))
    });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar livro de ordens.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:3000`);
});