const axios = require('axios');

// Binance
async function getOrderBookBinance(ativo) {
  try {
    const symbol = `${ativo.toUpperCase()}USDT`;
    const url = `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=5`;
    const res = await axios.get(url);
    if (res.data && res.data.bids && res.data.asks) {
      return {
        bids: res.data.bids,
        asks: res.data.asks
      };
    }
    return { bids: [], asks: [] };
  } catch (err) {
    // Se erro 429, aguarde 1 segundo antes de retornar vazio
    if (err.response && err.response.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return { bids: [], asks: [] };
  }
}

// MercadoBitcoin
async function getOrderBookMercadoBitcoin(ativo) {
  try {
    const symbol = ativo.toLowerCase();
    const url = `https://api.mercadobitcoin.net/api/${symbol}/orderbook/`;
    const res = await axios.get(url);
    return {
      bids: res.data.bids,
      asks: res.data.asks
    };
  } catch (err) {
    return { bids: [], asks: [] };
  }
}

// GateIO
async function getOrderBookGateIO(ativo) {
  try {
    const symbol = `${ativo.toLowerCase()}_usdt`;
    const url = `https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${symbol}&limit=5`;
    const res = await axios.get(url);
    return {
      bids: res.data.bids,
      asks: res.data.asks
    };
  } catch (err) {
    return { bids: [], asks: [] };
  }
}

// Bybit
async function getOrderBookBybit(ativo) {
  try {
    const symbol = `${ativo.toUpperCase()}USDT`;
    const url = `https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${symbol}&limit=5`;
    const res = await axios.get(url);
    return {
      bids: res.data.result.b,
      asks: res.data.result.a
    };
  } catch (err) {
    return { bids: [], asks: [] };
  }
}

// Função principal para buscar o livro de ordens de uma exchange
async function getOrderBooks(ativo, exchange) {
  switch (exchange.toLowerCase()) {
    case 'binance':
      return await getOrderBookBinance(ativo);
    case 'mercadobitcoin':
      return await getOrderBookMercadoBitcoin(ativo);
    case 'gateio':
      return await getOrderBookGateIO(ativo);
    case 'bybit':
      return await getOrderBookBybit(ativo);
    // Adicione outras exchanges aqui seguindo o mesmo padrão
    default:
      return { bids: [], asks: [] };
  }
}

module.exports = { getOrderBooks };