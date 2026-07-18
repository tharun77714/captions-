export const SEMANTIC_DICTIONARIES: Record<string, string[]> = {
  money: ['dollar', 'dollars', 'money', 'cash', 'revenue', 'profit', 'sales', 'mrr', 'million', 'billion', 'thousands', 'rich', 'wealth'],
  authority: ['secret', 'truth', 'guaranteed', 'proven', 'expert', 'system', 'method', 'framework', 'formula'],
  action: ['stop', 'listen', 'look', 'build', 'create', 'destroy', 'grow', 'scale', 'start', 'quit', 'buy', 'sell'],
  education: ['therefore', 'because', 'step', 'first', 'second', 'conclusion', 'learn', 'understand', 'read', 'book', 'study', 'lesson'],
  negative: ['fail', 'lose', 'poor', 'broke', 'mistake', 'wrong', 'never', 'bad', 'worst']
};

export const SEMANTIC_COLORS: Record<string, string> = {
  money: '#FFEA00',     // Yellow
  action: '#00FFB2',    // Green
  authority: '#FFFFFF', // White
  education: '#4DB8FF', // Blue
  negative: '#FF3333'   // Red
};

export const SEMANTIC_ANIMATIONS: Record<string, string> = {
  money: 'pop',
  action: 'scale',
  authority: 'glow',
  education: 'fadeIn',
  negative: 'shake'
};

export const SEMANTIC_EMOJIS: Record<string, string[]> = {
  money: ['💰', '💵', '📈'],
  authority: ['🤫', '👑', '✅'],
  action: ['🛑', '🔨', '💥'],
  education: ['📚', '🧠', '💡'],
  negative: ['📉', '❌', '👎']
};
