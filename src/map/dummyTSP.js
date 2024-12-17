function completeSearch(D, SOURCE, MANDATORY, DESTINATION) {
    /* ---------init DummyTSP--------- */
    scene = [SOURCE, ...MANDATORY, DESTINATION]
    const N = scene.length + 1,
          adj = new Array(N).fill(INF).map(() => new Array(N).fill(INF));

    for(let i = 0; i < N - 1; i++)
        for(let j = 0; j < N - 1; j++)
            if(i === j) adj[i][i] = 0
            else adj[i][j] = D[scene[i]][scene[j]]  * 1000

    // Dummy Node
    adj[N-2][N-1] = 0.1 * 1000;
    adj[N-1][0] = 0.1 * 1000;

    /* ---------TSP implement--------- */
    const visited = new Array(N).fill(0),
          x_best = new Array(N).fill(0),
          x = new Array(N).fill(0);

    let current_cost = 0,
        best_cost = Number.MAX_SAFE_INTEGER;

    function update_best_solution(current_cost)
    {
        if (current_cost + adj[x[N-1]][0] < best_cost)
        {
            best_cost = current_cost + adj[x[N-1]][0];
    
            for (let i = 0; i < N; ++i)
                x_best[i] = x[i];
        }
    }
    
    function recursion(i)
    {
        for (let j = 1; j < N; ++j)
            if (!visited[j]) 
            {
                x[i] = j;
                visited[j] = 1;
                current_cost += adj[x[i - 1]][x[i]];

                if (i === N-1) update_best_solution(current_cost);
                else recursion(i + 1);
    
                visited[j] = 0;
                current_cost -= adj[x[i - 1]][x[i]];
            }
    }

    x[0] = 0;
    visited[0] = 1;
    recursion(1);

    bestScene = [...x_best];
    let minDistance = 0;
    bestScene.pop()

    for(let i = 0; i < bestScene.length; i++) {
        bestScene[i] = scene[bestScene[i]]
        if(i > 0) minDistance += D[bestScene[i-1]][bestScene[i]]
    }

    return { minDistance, bestScene };
}

function BnB(D, SOURCE, MANDATORY, DESTINATION) {
    /* ---------init DummyTSP--------- */
    scene = [SOURCE, ...MANDATORY, DESTINATION]
    const N = scene.length + 1,
          adj = new Array(N).fill(INF).map(() => new Array(N).fill(INF));

    for(let i = 0; i < N - 1; i++)
        for(let j = 0; j < N - 1; j++)
            if(i === j) adj[i][i] = 0
            else adj[i][j] = D[scene[i]][scene[j]]  * 1000

    // Dummy Node
    adj[N-2][N-1] = 0.1 * 1000;
    adj[N-1][0] = 0.1 * 1000;

    /* ---------TSP implement--------- */
    const visited = new Array(N).fill(0),
          x_best = new Array(N).fill(0),
          x = new Array(N).fill(0);

    let current_cost = 0,
        min_edge = Number.MAX_SAFE_INTEGER,
        best_cost = Number.MAX_SAFE_INTEGER;

    for(let i = 0; i < N - 1; i++)
        for(let j = 0; j < N - 1; j++) 
            if (i !== j) min_edge = Math.min(adj[i][j])

    function update_best_solution(current_cost)
    {
        if (current_cost + adj[x[N-1]][0] < best_cost)
        {
            best_cost = current_cost + adj[x[N-1]][0];
    
            for (let i = 0; i < N; ++i)
                x_best[i] = x[i];
        }
    }
    
    function recursion(i)
    {
        if (current_cost  > best_cost) return;
        // + Math.max((N-i - 2) * min_edge, 0)
        for (let j = 1; j < N; ++j)
            if (!visited[j]) 
            {
                x[i] = j;
                visited[j] = 1;
                current_cost += adj[x[i - 1]][x[i]];

                if (i === N-1) update_best_solution(current_cost);
                else recursion(i + 1);
    
                visited[j] = 0;
                current_cost -= adj[x[i - 1]][x[i]];
            }
    }

    x[0] = 0;
    visited[0] = 1;
    recursion(1);

    bestScene = [...x_best];
    let minDistance = 0;
    bestScene.pop()
    
    for(let i = 0; i < bestScene.length; i++) {
        bestScene[i] = scene[bestScene[i]]
        if(i > 0) minDistance += D[bestScene[i-1]][bestScene[i]]
    }

    return { minDistance, bestScene };
}

function GA(D, SOURCE, MANDATORY, DESTINATION) {
    /* ---------init DummyTSP--------- */
    scene = [SOURCE, ...MANDATORY, DESTINATION]
    const N = scene.length + 1,
            adj = new Array(N).fill(INF).map(() => new Array(N).fill(INF));

    for(let i = 0; i < N - 1; i++)
        for(let j = 0; j < N - 1; j++) 
            if(i === j) adj[i][i] = 0
            else adj[i][j] = D[scene[i]][scene[j]]

    // Dummy Node
    adj[N-2][N-1] = 0.1;
    adj[N-1][0] = 0.1;
    

    /* ---------GA--------- */
    let bestTour;
    class Tour {
        constructor(cities) {
            this.cities = cities;
            this.distance = this.calculateTotalDistance();
            this.fitness = this.calculateFitness();
        }
    
        calculateTotalDistance() {
            let totalDistance = 0;

            for (let i = 0; i < this.cities.length - 1; i++)
                totalDistance += adj[this.cities[i]][this.cities[i + 1]];

            totalDistance += adj[this.cities[this.cities.length - 1]][this.cities[0]];
            return totalDistance - 0.2;
        }
    
        calculateFitness() {
            return 1 / this.distance;
        }
    }
    
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    function generateInitialPopulation(cities, populationSize) {
        const population = [];
    
        for (let i = 0; i < populationSize; i++) {
            const shuffledCities = [...cities];
            shuffle(shuffledCities);
            population.push(new Tour(shuffledCities));
        }
    
        return population;
    }
    
    function selectParent(population) {
        const selectionSize = 5;
        let best = null;
    
        for (let i = 0; i < selectionSize; i++) {
            const randomIndex = Math.floor(Math.random() * population.length);
            const candidate = population[randomIndex];
            if (best === null || candidate.fitness > best.fitness)
                best = candidate;
        }
    
        return best;
    }
    
    function crossover(parent1, parent2) {
        const startIndex = Math.floor(Math.random() * parent1.cities.length);
        const endIndex = Math.floor(Math.random() * parent1.cities.length);
    
        const offspringCities = parent1.cities.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex));
    
        for (const city of parent2.cities) {
            if (!offspringCities.includes(city)) {
                offspringCities.push(city);
            }
        }
    
        return new Tour(offspringCities);
    }
    
    function mutate(tour) {
        const index1 = Math.floor(Math.random() * tour.cities.length);
        const index2 = Math.floor(Math.random() * tour.cities.length);
    
        [tour.cities[index1], tour.cities[index2]] = [tour.cities[index2], tour.cities[index1]];
    }
    
    function runGeneticAlgorithm(cities, populationSize, generations, mutationRate, rankingsurvivorSize) {
        let population = generateInitialPopulation(cities, populationSize);
        
        function runGeneration(currentGeneration) {
            const newPopulation = [];

            for (let i = 0; i < populationSize; i++) {
                const parent1 = selectParent(population);
                const parent2 = selectParent(population);
                const offspring = crossover(parent1, parent2);
        
                if (Math.random() < mutationRate)
                    mutate(offspring);

                offspring.distance = offspring.calculateTotalDistance();
                offspring.fitness = offspring.calculateFitness();
                newPopulation.push(offspring);
            }
        
            population.push(...newPopulation);
            population.sort((individual1, individual2) => individual2.fitness - individual1.fitness);

            let i = 0;
            while(i < populationSize && population.length > populationSize)
                if(population[i].fitness === population[i+1].fitness)
                    population.splice(i+1, 1);
                else i++;

            let nPopulation = population.length;
            for(let i = populationSize; i < nPopulation; i++) {
                rand = Math.floor(Math.random() * (nPopulation-1 - rankingsurvivorSize) + rankingsurvivorSize);
                [population[i], population[rand]] = [population[rand], population[i]];
            }
            while (population.length > populationSize)
                population.pop()

            bestTour = population[0];
            // console.log(`Generation ${currentGeneration + 1}: Best distance: ${bestTour.distance}`);
        }

        for(let currentGeneration = 0; currentGeneration < generations; currentGeneration++)        
            runGeneration(currentGeneration);
    }
      
    const populationSize = 100;
    const generations = 200;
    const mutationRate = 0.015;
    const rankingsurvivorRate = 0.2;

    const cities = [];
    for (let i = 0; i < N; i++) cities.push(i);

    runGeneticAlgorithm(cities, populationSize, generations, mutationRate, rankingsurvivorRate * populationSize);

    bestScene = [...bestTour.cities];
    while(bestScene[0] !== 0) {
        let firstElement = bestScene.shift();
        bestScene.push(firstElement)
    }

    let minDistance = 0;
    bestScene.pop();

    for(let i = 0; i < bestScene.length; i++) {
        bestScene[i] = scene[bestScene[i]]
        if(i > 0) minDistance += D[bestScene[i-1]][bestScene[i]]
    }

    return { minDistance, bestScene };
}