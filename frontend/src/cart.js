let carrinho = [];

// Adicionar peça ao carrinho
export function addToCart(peca, quantidade, preco_unitario) {
  const existente = carrinho.find(p => p.id === peca.id);

  if (existente) {
    existente.quantidade += quantidade;
  } else {
    carrinho.push({
      id: peca.id,
      nome: peca.nome,
      codigo: peca.codigo,
      quantidade,
      preco_unitario
    });
  }
}

// Remover item
export function removeFromCart(id) {
  carrinho = carrinho.filter(p => p.id !== id);
}

// Limpar carrinho após venda
export function clearCart() {
  carrinho = [];
}

// Obter carrinho
export function getCart() {
  return carrinho;
}
