/**
 * AIFIE GRAPH REINFORCEMENT LEARNING (GRL) ADAPTIVE EXECUTION ROUTER
 * 
 * Adaptive reinforcement learning policy agent optimizing order routing,
 * dark pool midpoint matching, and liquidity impact balancing based on
 * graph topology centrality and real-time microstructure signals.
 * 
 * State Space:
 * [PageRank Centrality, Kyle's Lambda, Order Book Imbalance, Urgency, Remaining Window Fraction]
 * 
 * Action Space:
 * 0: MAKER_PASSIVE_LIT (Post-Only limit order at best bid/ask)
 * 1: TAKER_AGGRESSIVE_LIT (Immediate liquidity crossing)
 * 2: DARK_POOL_MIDPOINT (Zero-slippage hidden midpoint match)
 * 3: TWAP_UNIFORM_SLICE (Time-weighted linear tranche)
 * 4: VWAP_LIQUIDITY_DAMPENED (Centrality-dampened liquidity tranche)
 * 
 * Pure Node.js ESM - Built-in standard library only.
 */

export const GRL_ACTIONS = [
  "MAKER_PASSIVE_LIT",
  "TAKER_AGGRESSIVE_LIT",
  "DARK_POOL_MIDPOINT",
  "TWAP_UNIFORM_SLICE",
  "VWAP_LIQUIDITY_DAMPENED"
];

export class GraphRLExecutionRouter {
  /**
   * @param {Object} [options]
   * @param {number} [options.learningRate=0.05]
   * @param {number} [options.discountFactor=0.95]
   * @param {number} [options.epsilon=0.15] Exploration rate
   */
  constructor(options = {}) {
    this.learningRate = options.learningRate || 0.05;
    this.discountFactor = options.discountFactor || 0.95;
    this.epsilon = options.epsilon || 0.15;
    this.numActions = GRL_ACTIONS.length;
    this.numStateBuckets = 5;

    // Q-Table map: quantizedStateKey -> Float64Array[numActions]
    this.qTable = new Map();
    this.experienceReplay = [];
    this.totalSteps = 0;
  }

  _discretizeState(stateVector) {
    // stateVector: [pageRank, kyleLambda, imbalance, urgency, timeFraction]
    const b0 = Math.min(4, Math.floor((stateVector[0] || 0.04) * 25));
    const b1 = Math.min(4, Math.floor((stateVector[1] || 0.001) * 2000));
    const b2 = Math.min(4, Math.floor(((stateVector[2] || 0.0) + 1.0) * 2.5));
    const b3 = Math.min(4, Math.floor((stateVector[3] || 0.5) * 5));
    const b4 = Math.min(4, Math.floor((stateVector[4] || 1.0) * 5));
    return `S_${b0}_${b1}_${b2}_${b3}_${b4}`;
  }

  _getQValues(stateKey) {
    if (!this.qTable.has(stateKey)) {
      const q = new Float64Array(this.numActions);
      // Prioritize DARK_POOL_MIDPOINT and VWAP_LIQUIDITY_DAMPENED slightly as initial heuristic
      q[2] = 0.5;
      q[4] = 0.4;
      this.qTable.set(stateKey, q);
    }
    return this.qTable.get(stateKey);
  }

  /**
   * Select optimal action using Epsilon-Greedy policy
   * @param {Array<number>} stateVector [pageRank, kyleLambda, imbalance, urgency, timeFraction]
   * @returns {Object} Selected action and routing parameters
   */
  selectAction(stateVector) {
    const stateKey = this._discretizeState(stateVector);
    const qValues = this._getQValues(stateKey);

    let actionIndex = 0;
    const isExploring = Math.random() < this.epsilon;

    if (isExploring) {
      actionIndex = Math.floor(Math.random() * this.numActions);
    } else {
      let maxQ = -Infinity;
      for (let a = 0; a < this.numActions; a++) {
        if (qValues[a] > maxQ) {
          maxQ = qValues[a];
          actionIndex = a;
        }
      }
    }

    const actionName = GRL_ACTIONS[actionIndex];
    return {
      actionIndex,
      actionName,
      isExploring,
      qValue: Number(qValues[actionIndex].toFixed(4)),
      stateKey
    };
  }

  /**
   * Calculate institutional execution reward
   * @param {Object} metrics
   * @param {number} metrics.slippageBps Realized slippage in basis points
   * @param {number} metrics.feeBps Exchange fee / rebate
   * @param {number} metrics.marketImpactBps Expected permanent impact
   * @param {number} metrics.fillRate Fraction filled (0 to 1)
   * @returns {number}
   */
  calculateReward(metrics = {}) {
    const {
      slippageBps = 1.0,
      feeBps = 0.5,
      marketImpactBps = 0.5,
      fillRate = 1.0
    } = metrics;

    // Cost penalty: higher slippage, fee, and market impact reduce reward
    const costPenalty = (slippageBps * 1.5) + (feeBps * 1.0) + (marketImpactBps * 2.0);
    const fillBonus = fillRate * 10.0;
    const reward = Number((fillBonus - costPenalty).toFixed(4));
    return reward;
  }

  /**
   * Update Q-table using Bellman equation
   * @param {Array<number>} state
   * @param {number} actionIndex
   * @param {number} reward
   * @param {Array<number>} nextState
   */
  update(state, actionIndex, reward, nextState) {
    const stateKey = this._discretizeState(state);
    const nextStateKey = this._discretizeState(nextState);

    const qValues = this._getQValues(stateKey);
    const nextQValues = this._getQValues(nextStateKey);

    let maxNextQ = -Infinity;
    for (let a = 0; a < this.numActions; a++) {
      if (nextQValues[a] > maxNextQ) maxNextQ = nextQValues[a];
    }

    // Bellman update: Q(s,a) = Q(s,a) + alpha * (r + gamma * max_a' Q(s',a') - Q(s,a))
    const currentQ = qValues[actionIndex];
    const targetQ = reward + this.discountFactor * maxNextQ;
    qValues[actionIndex] = Number((currentQ + this.learningRate * (targetQ - currentQ)).toFixed(4));

    this.totalSteps += 1;
    this.experienceReplay.push({ stateKey, actionIndex, reward, nextStateKey });
    if (this.experienceReplay.length > 500) this.experienceReplay.shift();
  }

  /**
   * Compute complete RL execution plan for an incoming institutional slice
   * @param {Object} sliceContext
   * @param {string} sliceContext.symbol
   * @param {number} sliceContext.sliceQuantity
   * @param {number} sliceContext.currentPrice
   * @param {number} [sliceContext.pageRank=0.04]
   * @param {number} [sliceContext.kyleLambda=0.0005]
   * @param {number} [sliceContext.orderImbalance=0.1]
   * @param {number} [sliceContext.urgency=0.5]
   * @param {number} [sliceContext.timeFraction=1.0]
   * @returns {Object}
   */
  routeExecutionSlice(sliceContext = {}) {
    const {
      symbol = "AAPL",
      sliceQuantity = 100,
      currentPrice = 150.0,
      pageRank = 0.04,
      kyleLambda = 0.0005,
      orderImbalance = 0.1,
      urgency = 0.5,
      timeFraction = 1.0
    } = sliceContext;

    const stateVector = [pageRank, kyleLambda, orderImbalance, urgency, timeFraction];
    const decision = this.selectAction(stateVector);

    // Estimate realistic venue execution parameters based on action
    let estimatedSlippageBps = 0.5;
    let expectedVenue = "LIT_ORDER_BOOK";
    let orderType = "LIMIT";

    if (decision.actionName === "DARK_POOL_MIDPOINT") {
      estimatedSlippageBps = 0.05;
      expectedVenue = "DARK_POOL_ATS";
      orderType = "MIDPOINT_PEGGED";
    } else if (decision.actionName === "TAKER_AGGRESSIVE_LIT") {
      estimatedSlippageBps = 2.4;
      expectedVenue = "PRIMARY_EXCHANGE";
      orderType = "MARKET";
    } else if (decision.actionName === "VWAP_LIQUIDITY_DAMPENED") {
      estimatedSlippageBps = 0.8;
      expectedVenue = "SMART_ROUTED_MULTIVIEW";
      orderType = "ICEBERG_LIMIT";
    }

    const rewardEstimate = this.calculateReward({
      slippageBps: estimatedSlippageBps,
      feeBps: 0.2,
      marketImpactBps: Number((pageRank * 10).toFixed(2)),
      fillRate: 1.0
    });

    return {
      routingId: `GRL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      symbol,
      sliceQuantity,
      currentPrice,
      decision: {
        action: decision.actionName,
        isExploratory: decision.isExploring,
        qValue: decision.qValue,
        expectedVenue,
        orderType,
        estimatedSlippageBps,
        expectedReward: rewardEstimate
      },
      stateContext: {
        pageRankCentrality: pageRank,
        kyleLambda,
        orderImbalance,
        urgency,
        timeFraction
      },
      policyStats: {
        totalLearnedStates: this.qTable.size,
        totalTrainingSteps: this.totalSteps
      }
    };
  }
}

export const graphRLExecutionRouter = new GraphRLExecutionRouter();
