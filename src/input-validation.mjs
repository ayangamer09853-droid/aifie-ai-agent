/**
 * Input Validation Utility for Aifie AI Agent
 * Provides validators for all API endpoints to prevent injection and invalid data
 */

/**
 * Validate a stock/crypto symbol
 * Pattern: AAPL, BTC/USD, BTCUSDT, RELIANCE.NS
 */
export function isValidSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return { valid: false, error: 'Symbol is required' };
  }

  const normalized = symbol.toUpperCase().trim();

  // Basic symbol pattern (no special characters except . / - _)
  if (!/^[A-Z0-9]+(?:[\.\/\-_][A-Z0-9]+)*$/.test(normalized)) {
    return { valid: false, error: 'Invalid symbol format' };
  }

  // Length limits
  if (normalized.length < 1 || normalized.length > 20) {
    return { valid: false, error: 'Symbol must be 1-20 characters' };
  }

  return { valid: true, value: normalized };
}

/**
 * Validate a numeric value is within range
 */
export function isValidNumber(value, { min = -Infinity, max = Infinity, required = true } = {}) {
  if (required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: 'Value is required' };
  }

  if (!required && (value === undefined || value === null || value === '')) {
    return { valid: true, value: null };
  }

  const num = Number(value);

  if (!Number.isFinite(num)) {
    return { valid: false, error: 'Value must be a valid number' };
  }

  if (num < min || num > max) {
    return { valid: false, error: `Value must be between ${min} and ${max}` };
  }

  return { valid: true, value: num };
}

/**
 * Validate order side
 */
export function isValidSide(side) {
  if (!side || typeof side !== 'string') {
    return { valid: false, error: 'Side is required' };
  }

  const normalized = side.toLowerCase().trim();

  if (!['buy', 'sell'].includes(normalized)) {
    return { valid: false, error: 'Side must be "buy" or "sell"' };
  }

  return { valid: true, value: normalized };
}

/**
 * Validate quantity (positive integer)
 */
export function isValidQuantity(quantity, { max = 1000000 } = {}) {
  const result = isValidNumber(quantity, { min: 1, max, required: true });

  if (!result.valid) {
    return result;
  }

  if (!Number.isInteger(result.value)) {
    return { valid: false, error: 'Quantity must be an integer' };
  }

  return result;
}

/**
 * Validate price (positive number)
 */
export function isValidPrice(price) {
  return isValidNumber(price, { min: 0.0001, max: 1000000 });
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercentage(percentage) {
  return isValidNumber(percentage, { min: 0, max: 100 });
}

/**
 * Validate order object
 */
export function validateOrder(order) {
  const errors = [];

  if (!order || typeof order !== 'object') {
    return { valid: false, errors: ['Order must be an object'] };
  }

  // Symbol validation
  const symbolResult = isValidSymbol(order.symbol);
  if (!symbolResult.valid) {
    errors.push(`symbol: ${symbolResult.error}`);
  }

  // Side validation
  const sideResult = isValidSide(order.side);
  if (!sideResult.valid) {
    errors.push(`side: ${sideResult.error}`);
  }

  // Quantity validation
  const quantityResult = isValidQuantity(order.quantity);
  if (!quantityResult.valid) {
    errors.push(`quantity: ${quantityResult.error}`);
  }

  // Price validation (optional for market orders)
  if (order.price !== undefined) {
    const priceResult = isValidPrice(order.price);
    if (!priceResult.valid) {
      errors.push(`price: ${priceResult.error}`);
    }
  }

  // Mode validation
  const validModes = ['paper', 'live'];
  if (order.mode && !validModes.includes(order.mode.toLowerCase())) {
    errors.push(`mode: must be "paper" or "live"`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      symbol: symbolResult.value,
      side: sideResult.value,
      quantity: quantityResult.value,
      price: order.price ? Number(order.price) : undefined,
      mode: order.mode?.toLowerCase() || 'paper',
    },
  };
}

/**
 * Validate task request
 */
export function validateTaskRequest(task) {
  const errors = [];

  if (!task || typeof task !== 'object') {
    return { valid: false, errors: ['Task must be an object'] };
  }

  if (!task.lane || typeof task.lane !== 'string') {
    errors.push('lane is required and must be a string');
  }

  if (!task.objective || typeof task.objective !== 'string') {
    errors.push('objective is required and must be a string');
  }

  // Limit lengths
  if (task.lane && task.lane.length > 50) {
    errors.push('lane must be 50 characters or less');
  }

  if (task.objective && task.objective.length > 500) {
    errors.push('objective must be 500 characters or less');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Validate replica request
 */
export function validateReplicaRequest(request) {
  const errors = [];

  if (!request || typeof request !== 'object') {
    return { valid: false, errors: ['Request must be an object'] };
  }

  if (!request.templateId || typeof request.templateId !== 'string') {
    errors.push('templateId is required');
  }

  if (!request.reason || typeof request.reason !== 'string') {
    errors.push('reason is required');
  }

  if (request.reason && request.reason.length > 200) {
    errors.push('reason must be 200 characters or less');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Validate terminal command (security - block dangerous commands)
 */
const DANGEROUS_COMMANDS = [
  'rm -rf',
  'rm /',
  'dd if=',
  'mkfs',
  'fdisk',
  ':(){:|:&};:',  // Fork bomb
  'curl | sh',
  'wget | sh',
  'chmod 777 /',
  'chown -R',
];

export function validateTerminalCommand(command) {
  if (!command || typeof command !== 'string') {
    return { valid: false, error: 'Command is required' };
  }

  const trimmed = command.trim();

  // Length limit
  if (trimmed.length > 500) {
    return { valid: false, error: 'Command too long (max 500 chars)' };
  }

  // Check for dangerous patterns
  const lowerCmd = trimmed.toLowerCase();
  for (const danger of DANGEROUS_COMMANDS) {
    if (lowerCmd.includes(danger.toLowerCase())) {
      return { valid: false, error: `Command blocked: contains dangerous pattern "${danger}"` };
    }
  }

  // Block shell injection attempts
  if (trimmed.includes(';') && !trimmed.startsWith('echo ')) {
    // Allow simple echo commands but block chained commands
    return { valid: false, error: 'Command chaining not allowed' };
  }

  if (trimmed.includes('&&') || trimmed.includes('||')) {
    return { valid: false, error: 'Command operators not allowed' };
  }

  if (trimmed.includes('|') && !trimmed.startsWith('echo ')) {
    return { valid: false, error: 'Pipes not allowed' };
  }

  return { valid: true, value: trimmed };
}

export default {
  isValidSymbol,
  isValidNumber,
  isValidSide,
  isValidQuantity,
  isValidPrice,
  isValidPercentage,
  validateOrder,
  validateTaskRequest,
  validateReplicaRequest,
  validateTerminalCommand,
};