/**
 * AIFIE GRAPH ATTENTION NETWORK (GAT) INFERENCE ENGINE
 * 
 * Implements high-performance Multi-Head Graph Self-Attention for financial networks.
 * Computes non-linear cross-asset feature aggregation, hidden correlation corridors,
 * and predictive contagion risk scoring.
 * 
 * Mathematical Formulation:
 * \alpha_{ij}^{(k)} = \frac{\exp(\text{LeakyReLU}(\mathbf{a}_k^T [\mathbf{W}_k \mathbf{h}_i \parallel \mathbf{W}_k \mathbf{h}_j]))}{\sum_{l \in \mathcal{N}_i} \exp(\text{LeakyReLU}(\mathbf{a}_k^T [\mathbf{W}_k \mathbf{h}_i \parallel \mathbf{W}_k \mathbf{h}_l]))}
 * \mathbf{h}_i' = \sigma\left(\frac{1}{K} \sum_{k=1}^K \sum_{j \in \mathcal{N}_i} \alpha_{ij}^{(k)} \mathbf{W}_k \mathbf{h}_j\right)
 * 
 * Pure Node.js ESM - Built-in standard library only.
 */

export class GraphAttentionNetwork {
  /**
   * @param {Object} [options]
   * @param {number} [options.inputDim=8] Number of input features per node
   * @param {number} [options.hiddenDim=8] Output feature dimension per head
   * @param {number} [options.numHeads=4] Number of multi-head attention mechanisms
   * @param {number} [options.negativeSlope=0.2] LeakyReLU negative slope
   */
  constructor(options = {}) {
    this.inputDim = options.inputDim || 8;
    this.hiddenDim = options.hiddenDim || 8;
    this.numHeads = options.numHeads || 4;
    this.negativeSlope = options.negativeSlope || 0.2;

    this.W = []; // Array of Float64Array weights [numHeads][hiddenDim * inputDim]
    this.a_src = []; // Array of Float64Array attention vectors [numHeads][hiddenDim]
    this.a_dst = []; // Array of Float64Array attention vectors [numHeads][hiddenDim]

    this._initializeWeights();
  }

  _initializeWeights() {
    const scale = Math.sqrt(2.0 / (this.inputDim + this.hiddenDim));
    for (let k = 0; k < this.numHeads; k++) {
      const wHead = new Float64Array(this.hiddenDim * this.inputDim);
      for (let i = 0; i < wHead.length; i++) {
        wHead[i] = (Math.random() * 2 - 1) * scale;
      }
      this.W.push(wHead);

      const aSrcHead = new Float64Array(this.hiddenDim);
      const aDstHead = new Float64Array(this.hiddenDim);
      for (let i = 0; i < this.hiddenDim; i++) {
        aSrcHead[i] = (Math.random() * 2 - 1) * 0.1;
        aDstHead[i] = (Math.random() * 2 - 1) * 0.1;
      }
      this.a_src.push(aSrcHead);
      this.a_dst.push(aDstHead);
    }
  }

  _leakyRelu(x) {
    return x >= 0 ? x : x * this.negativeSlope;
  }

  /**
   * Extract or normalize baseline feature vector for a financial node
   * @param {Object} node Graph node object
   * @param {Object} [marketContext] Live price/volatility map
   * @returns {Float64Array}
   */
  extractNodeFeatures(node, marketContext = {}) {
    const feat = new Float64Array(this.inputDim);
    const id = node.id;
    const ctx = marketContext[id] || {};

    // 0: Normalized log price or default
    feat[0] = ctx.price ? Math.log(Math.max(1, ctx.price)) / 10.0 : 0.5;
    // 1: 14-period RSI normalized (0 to 1)
    feat[1] = ctx.rsi ? ctx.rsi / 100.0 : 0.5;
    // 2: Volatility / ATR normalized
    feat[2] = ctx.volatility ? Math.min(1.0, ctx.volatility) : 0.25;
    // 3: Order flow imbalance (-1 to 1 shifted to 0 to 1)
    feat[3] = ctx.orderImbalance ? (ctx.orderImbalance + 1.0) / 2.0 : 0.5;
    // 4: Macro category one-hot proxy
    feat[4] = node.category === "CENTRAL_BANK" ? 1.0 : node.category === "MACRO_FACTOR" ? 0.8 : 0.2;
    // 5: Sector proxy
    feat[5] = node.category === "SECTOR" ? 0.9 : 0.1;
    // 6: Equity proxy
    feat[6] = node.category === "ASSET_EQUITY" ? 1.0 : 0.0;
    // 7: Crypto proxy
    feat[7] = node.category === "ASSET_CRYPTO" ? 1.0 : 0.0;

    return feat;
  }

  /**
   * Forward inference pass of Graph Attention Network over FinancialCausalityGraph
   * @param {Object} graph FinancialCausalityGraph instance
   * @param {Object} [marketContext] Real-time market features
   * @returns {Object} Attention weights, output representations, and contagion risk scores
   */
  forward(graph, marketContext = {}) {
    const nodes = graph.getAllNodes();
    const N = nodes.length;
    if (N === 0) return { success: false, message: "Graph is empty" };

    const nodeIndex = new Map(nodes.map((n, idx) => [n.id, idx]));
    const X = nodes.map(n => this.extractNodeFeatures(n, marketContext));

    // 1. Linear projection Wh for each head: [K][N][hiddenDim]
    const Wh = [];
    for (let k = 0; k < this.numHeads; k++) {
      const W_k = this.W[k];
      const headProj = [];
      for (let i = 0; i < N; i++) {
        const x_i = X[i];
        const h_proj = new Float64Array(this.hiddenDim);
        for (let r = 0; r < this.hiddenDim; r++) {
          let sum = 0;
          const rOffset = r * this.inputDim;
          for (let c = 0; c < this.inputDim; c++) {
            sum += W_k[rOffset + c] * x_i[c];
          }
          h_proj[r] = sum;
        }
        headProj.push(h_proj);
      }
      Wh.push(headProj);
    }

    // 2. Compute Multi-Head Attention Coefficients
    const attentionMatrix = {}; // "src->dst" -> Array of K attention weights
    const outputEmbeddings = new Map(); // nodeId -> Float64Array[hiddenDim * numHeads]
    const contagionRiskScores = {};

    for (let i = 0; i < N; i++) {
      const targetNode = nodes[i];
      const incomingEdges = graph.getIncomingEdges(targetNode.id);
      // Include self-loop
      const neighborIds = Array.from(new Set([...incomingEdges.map(e => e.from), targetNode.id]));
      const neighborIndices = neighborIds.map(id => nodeIndex.get(id)).filter(idx => idx !== undefined);

      const aggregatedHeadFeatures = [];

      for (let k = 0; k < this.numHeads; k++) {
        const aSrc = this.a_src[k];
        const aDst = this.a_dst[k];
        const Wh_k = Wh[k];
        const h_i = Wh_k[i];

        // Compute destination score a_dst^T h_i
        let dstScore = 0;
        for (let d = 0; d < this.hiddenDim; d++) {
          dstScore += aDst[d] * h_i[d];
        }

        // Compute unnormalized attention e_ij for all neighbors
        const unnormalizedE = [];
        let maxE = -Infinity;

        for (const j of neighborIndices) {
          const h_j = Wh_k[j];
          let srcScore = 0;
          for (let d = 0; d < this.hiddenDim; d++) {
            srcScore += aSrc[d] * h_j[d];
          }
          const e_ij = this._leakyRelu(srcScore + dstScore);
          unnormalizedE.push({ j, e_ij });
          if (e_ij > maxE) maxE = e_ij;
        }

        // Softmax with numerical stability
        let sumExp = 0;
        const expE = unnormalizedE.map(item => {
          const val = Math.exp(item.e_ij - maxE);
          sumExp += val;
          return { j: item.j, val };
        });

        // Compute head feature vector h_i^(k)
        const headOutput = new Float64Array(this.hiddenDim);
        for (const item of expE) {
          const alpha_ij = item.val / Math.max(1e-8, sumExp);
          const sourceNode = nodes[item.j];
          const edgeKey = `${sourceNode.id}-->${targetNode.id}`;

          if (!attentionMatrix[edgeKey]) attentionMatrix[edgeKey] = [];
          if (attentionMatrix[edgeKey].length <= k) attentionMatrix[edgeKey].push(Number(alpha_ij.toFixed(4)));

          const h_j = Wh_k[item.j];
          for (let d = 0; d < this.hiddenDim; d++) {
            headOutput[d] += alpha_ij * h_j[d];
          }
        }

        aggregatedHeadFeatures.push(headOutput);
      }

      // Concatenate multi-head outputs
      const finalDim = this.hiddenDim * this.numHeads;
      const finalVector = new Float64Array(finalDim);
      for (let k = 0; k < this.numHeads; k++) {
        const headVec = aggregatedHeadFeatures[k];
        const offset = k * this.hiddenDim;
        for (let d = 0; d < this.hiddenDim; d++) {
          // ELU activation
          const v = headVec[d];
          finalVector[offset + d] = v >= 0 ? v : Math.exp(v) - 1.0;
        }
      }
      outputEmbeddings.set(targetNode.id, finalVector);

      // Estimate Contagion Susceptibility Score (0.0 to 1.0)
      let vecMagnitude = 0;
      for (let d = 0; d < finalDim; d++) {
        vecMagnitude += finalVector[d] * finalVector[d];
      }
      const rawScore = Math.sqrt(vecMagnitude) / Math.sqrt(finalDim);
      contagionRiskScores[targetNode.id] = Number(Math.min(1.0, Math.max(0.05, rawScore * 0.85)).toFixed(4));
    }

    return {
      success: true,
      numNodes: N,
      numHeads: this.numHeads,
      hiddenDimension: this.hiddenDim,
      outputDimension: this.hiddenDim * this.numHeads,
      attentionMatrix,
      contagionRiskScores,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Predict systemic contagion impact on a specific asset given market shocks
   * @param {Object} graph FinancialCausalityGraph
   * @param {string} targetSymbol Asset symbol
   * @param {Object} [marketContext]
   * @returns {Object}
   */
  predictContagion(graph, targetSymbol, marketContext = {}) {
    const cleanSym = (targetSymbol || "AAPL").trim().toUpperCase();
    const result = this.forward(graph, marketContext);
    if (!result.success) return result;

    const riskScore = result.contagionRiskScores[cleanSym] || 0.45;
    const topAttentionSources = [];

    for (const [key, heads] of Object.entries(result.attentionMatrix)) {
      if (key.endsWith(`-->${cleanSym}`)) {
        const src = key.split("-->")[0];
        const avgAlpha = heads.reduce((sum, a) => sum + a, 0) / heads.length;
        topAttentionSources.push({ source: src, averageAttention: Number(avgAlpha.toFixed(4)), heads });
      }
    }

    topAttentionSources.sort((a, b) => b.averageAttention - a.averageAttention);

    let vulnerabilityTier = "LOW";
    if (riskScore >= 0.75) vulnerabilityTier = "CRITICAL";
    else if (riskScore >= 0.5) vulnerabilityTier = "ELEVATED";
    else if (riskScore >= 0.3) vulnerabilityTier = "MODERATE";

    return {
      symbol: cleanSym,
      contagionRiskScore: riskScore,
      vulnerabilityTier,
      topAttentionDrivers: topAttentionSources.slice(0, 5),
      timestamp: new Date().toISOString()
    };
  }
}

export const graphAttentionNetwork = new GraphAttentionNetwork();
