// js/tsne.js
// Implementação simplificada do t-SNE para redução de dimensão
// Créditos: Adaptado de https://github.com/JeremyShih/tsne-js

class TSNE {
    constructor(opt) {
        this.opt = opt || {};
        this.opt.epsilon = this.opt.epsilon || 10;
        this.opt.perplexity = this.opt.perplexity || 30;
        this.opt.dim = this.opt.dim || 2;
        this.opt.iter = this.opt.iter || 1000;

        this.maxIter = this.opt.iter;
        this.epsilon = this.opt.epsilon;
        this.perplexity = this.opt.perplexity;
        this.dim = this.opt.dim;

        this.data = [];
        this.Y = []; // Pontos de saída em baixa dimensão
        this.P = []; // Probabilidades P_ij
        this.gains = [];
        this.ystep = [];
    }

    initData(data) {
        this.data = data;
        this.N = data.length;
        this.D = data[0].length; 

        // Inicializa Y (pontos de saída em baixa dimensão) aleatoriamente
        this.Y = new Array(this.N).fill(0).map(() => new Array(this.dim).fill(0).map(() => Math.random() * 20 - 10));

        this.gains = new Array(this.N).fill(0).map(() => new Array(this.dim).fill(1));
        this.ystep = new Array(this.N).fill(0).map(() => new Array(this.dim).fill(0));

        // Pré-computa P (probabilidades de similaridade em alta dimensão)
        this.computeHighDimProbabilities();
    }

    computeHighDimProbabilities() {
        const N = this.N;
        const D = this.D;
        const data = this.data;
        const perplexity = this.perplexity;

        this.P = new Array(N * N).fill(0); // Matriz P_ij
        const distances = new Array(N * N).fill(0); // Matriz de distâncias euclidianas

        // Calcular distâncias euclidianas
        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                let dist = 0;
                for (let d = 0; d < D; d++) {
                    const diff = data[i][d] - data[j][d];
                    dist += diff * diff;
                }
                distances[i * N + j] = dist;
                distances[j * N + i] = dist;
            }
        }

        // Para cada ponto i, encontrar sigma_i para atingir a perplexidade
        for (let i = 0; i < N; i++) {
            let beta = 1.0;
            let minBeta = -Infinity;
            let maxBeta = Infinity;
            let H, P_row;

            // Busca binária para beta
            for (let iter = 0; iter < 50; iter++) {
                P_row = new Array(N).fill(0);
                let sumExp = 0;
                for (let j = 0; j < N; j++) {
                    if (i === j) continue;
                    P_row[j] = Math.exp(-distances[i * N + j] * beta);
                    sumExp += P_row[j];
                }

                if (sumExp === 0) {
                    H = 0;
                } else {
                    H = 0;
                    for (let j = 0; j < N; j++) {
                        if (i === j) continue;
                        P_row[j] /= sumExp;
                        if (P_row[j] > 1e-12) {
                            H += -P_row[j] * Math.log(P_row[j]);
                        }
                    }
                }

                const logPerp = Math.log(perplexity);
                if (H > logPerp) {
                    minBeta = beta;
                    beta = (maxBeta === Infinity ? beta * 2 : (beta + maxBeta) / 2);
                } else {
                    maxBeta = beta;
                    beta = (minBeta === -Infinity ? beta / 2 : (beta + minBeta) / 2);
                }
            }

            // Preencher a linha i da matriz P
            for (let j = 0; j < N; j++) {
                this.P[i * N + j] = P_row[j];
            }
        }

        // Simetrizar P: P_ij = (P_ij + P_ji) / (2N)
        // Isso é na verdade para Q_ij, mas para P_ij simetrizamos
        const P_sum = this.P.reduce((sum, val) => sum + val, 0); 
        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                this.P[i * N + j] = (this.P[i * N + j] + this.P[j * N + i]);
                this.P[j * N + i] = this.P[i * N + j];
            }
        }
        for(let i=0; i< N*N; i++) {
            this.P[i] /= (2 * N);
        }
    }

    step() {
        const N = this.N;
        const dim = this.dim;
        const Y = this.Y;
        const P = this.P;
        const gains = this.gains;
        const ystep = this.ystep;

        const Q = new Array(N * N).fill(0);
        const inv_distances_Y = new Array(N * N).fill(0);
        const dC = new Array(N * dim).fill(0);

        let sum_inv_distances_Y = 0;
        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                let dist_sq = 0;
                for (let d = 0; d < dim; d++) {
                    const diff = Y[i][d] - Y[j][d];
                    dist_sq += diff * diff;
                }
                const inv = 1 / (1 + dist_sq);
                inv_distances_Y[i * N + j] = inv;
                inv_distances_Y[j * N + i] = inv;
                sum_inv_distances_Y += inv * 2; 
            }
        }

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                Q[i * N + j] = inv_distances_Y[i * N + j] / sum_inv_distances_Y;
            }
        }

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                if (i === j) continue;
                const mult = (P[i * N + j] - Q[i * N + j]) * inv_distances_Y[i * N + j];
                for (let d = 0; d < dim; d++) {
                    dC[i * dim + d] += mult * (Y[i][d] - Y[j][d]);
                }
            }
        }

        const momentum = 0.8;
        const learningRate = this.epsilon;

        for (let i = 0; i < N; i++) {
            for (let d = 0; d < dim; d++) {
                const grad = dC[i * dim + d];
                const prevStep = ystep[i][d];

                gains[i][d] = (Math.sign(grad) !== Math.sign(prevStep)) ?
                    gains[i][d] + 0.2 : gains[i][d] * 0.8;
                if (gains[i][d] < 0.01) gains[i][d] = 0.01; // Mínimo
                
                const newStep = momentum * prevStep - learningRate * gains[i][d] * grad;
                ystep[i][d] = newStep;
                Y[i][d] += newStep;
            }
        }
        
        return Y;
    }

    run() {
        return new Promise(async (resolve) => {
            for (let i = 0; i < this.maxIter; i++) {
                this.step();
                if (i % 50 === 0) {
                    console.log(`t-SNE iteration: ${i}/${this.maxIter}`);
                }
                await new Promise(r => setTimeout(r, 0));
            }
            resolve(this.Y);
        });
    }
}
export {TSNE};