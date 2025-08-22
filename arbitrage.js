function calcularArbitragem(orderBooks) {
  const oportunidades = [];

  const exchanges = Object.keys(orderBooks);

  for (let i = 0; i < exchanges.length; i++) {
    for (let j = 0; j < exchanges.length; j++) {
      if (i === j) continue;

      const buyEx = exchanges[i];
      const sellEx = exchanges[j];

      const buyBook = orderBooks[buyEx];
      const sellBook = orderBooks[sellEx];

      const buyPrice = parceFloat(buyBook?.bids?.[0]?. [0] || 0);
      const sellPrice = parseFloat(sellBook?.asks?.[0]?.[0] || 0);

      if (buyPrice && sellPrice && sellPrice > buyPrice) {
        oportunidades.push({
          asset: 'BTC/USDT',
          buyExchange: buyEx,
          sellExchange: sellEx,
          buyPrice,
          sellPrice,
          profit: (sellPrice - buyPrice).toFixed(2)
        });
      }
    }
  }

  return oportunidades;
}

module.exports = { calcularArbitragem };