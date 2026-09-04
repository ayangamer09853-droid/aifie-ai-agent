/**
 * Genetic Strategy Optimizer
 * Autonomous population evolution, multi-gene recombination, crossover,
 * Gaussian parameter mutation, and elitism preservation.
 */

export class GeneticOptimizer {
  constructor(strategyFactory, fitnessFunction) {
    this.factory = strategyFactory;
    this.fitness = fitnessFunction;
    this.population = [];
  }

  evolve(generations = 50, populationSize = 100) {
    // Initialize random population
    this.population = Array(populationSize).fill(0).map((_, i) => ({
      params: this.randomParams(),
      fitness: 0,
      id: i
    }));

    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness
      for (const individual of this.population) {
        const strategy = typeof this.factory?.build === "function"
          ? this.factory.build(individual.params)
          : (typeof this.factory === "function" ? this.factory(individual.params) : null);
        individual.fitness = typeof this.fitness === "function" ? this.fitness(strategy, individual.params) : 0;
      }

      // Sort by fitness descending
      this.population.sort((a, b) => b.fitness - a.fitness);

      // Elitism: keep top 10%
      const eliteCount = Math.max(1, Math.ceil(populationSize * 0.1));
      const elite = this.population.slice(0, eliteCount);

      // Mutation & crossover to replenish population
      const offspring = [];
      while (offspring.length < populationSize - elite.length) {
        const parent1 = elite[Math.floor(Math.random() * elite.length)];
        const parent2 = elite[Math.floor(Math.random() * elite.length)];

        const child = this.crossover(parent1, parent2);
        if (Math.random() < 0.25) this.mutate(child);
        offspring.push(child);
      }

      this.population = [...elite, ...offspring];
    }

    // Final evaluation & sort
    for (const individual of this.population) {
      const strategy = typeof this.factory?.build === "function"
        ? this.factory.build(individual.params)
        : (typeof this.factory === "function" ? this.factory(individual.params) : null);
      individual.fitness = typeof this.fitness === "function" ? this.fitness(strategy, individual.params) : 0;
    }
    this.population.sort((a, b) => b.fitness - a.fitness);

    return {
      bestIndividual: this.population[0],
      topElite: this.population.slice(0, 5),
      populationSize: this.population.length,
      generations
    };
  }

  randomParams() {
    const types = ["SMA", "MOMENTUM", "MEANREVERSION"];
    return {
      type: types[Math.floor(Math.random() * types.length)],
      period: Math.floor(Math.random() * 95) + 5,
      threshold: Number((Math.random() * 5 + 0.1).toFixed(2))
    };
  }

  crossover(parent1, parent2) {
    return {
      params: {
        type: Math.random() < 0.5 ? parent1.params.type : parent2.params.type,
        period: Math.random() < 0.5 ? parent1.params.period : parent2.params.period,
        threshold: Math.random() < 0.5 ? parent1.params.threshold : parent2.params.threshold
      },
      fitness: 0,
      id: Math.random()
    };
  }

  mutate(individual) {
    if (Math.random() < 0.5) {
      individual.params.period = Math.max(5, individual.params.period + Math.floor((Math.random() - 0.5) * 10));
    }
    if (Math.random() < 0.5) {
      individual.params.threshold = Math.max(0.1, Number((individual.params.threshold + (Math.random() - 0.5)).toFixed(2)));
    }
  }
}
