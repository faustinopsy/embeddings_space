import { pipeline, env } from './transformers.js';
import { localVectorDB } from './local-db.js';
import { TSNE } from './tsne.js';

env.allowRemoteModels = false;
env.localModelPath = '../models/';
env.useBrowserCache = false; 

let extractor = null;
let pontosSelecionados = []; 

async function init() {
    atualizarStatus("Inicializando motor gráfico...");
    inicializarPlotly();

    try {
        atualizarStatus("Carregando IA (Transformers.js)...");
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        const seeds = ["homem", "mulher", "rei", "rainha", "fruta", "maçã", "tecnologia", "python"];
        for (const s of seeds) await processarTexto(s, false);
        if (localVectorDB.getAll().length > 1) await window.rodarTSNE();
        atualizarStatus("Pronto. Clique nos pontos para comparar.");
    } catch (e) {
        atualizarStatus("ERRO: " + e.message);
    }
}

async function processarTexto(text, updatePlot = true) {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    localVectorDB.add(text, Array.from(output.data));
    if (updatePlot) atualizarStatus(`"${text}" vetorizado.`);
}

window.adicionarTexto = async function() {
    const text = document.getElementById('inputText').value.trim();
    if (!text) return;
    await processarTexto(text);
    document.getElementById('inputText').value = '';
    window.rodarTSNE();
};

window.rodarTSNE = async function() {
    const vectors = localVectorDB.getAllVectors();
    if (vectors.length < 3) return alert("Adicione pelo menos 3 itens.");
    
    atualizarStatus("Calculando redução de dimensão (t-SNE)...");
    
    const tsne = new TSNE({ 
        dim: 4, 
        perplexity: Math.min(vectors.length - 1, 5), 
        iter: 600,
        epsilon: 10 
    });
    
    tsne.initData(vectors);
    const result = await tsne.run();

    localVectorDB.getAll().forEach((item, i) => localVectorDB.updateReducedVector(i, result[i]));
    
    plotarGrafico();
    atualizarStatus("Espaço 3D atualizado.");
};

window.limparTudo = function() {
    localVectorDB.clear();
    pontosSelecionados = [];
    plotarGrafico();
    document.getElementById('comparison-panel').style.display = 'none';
};


function inicializarPlotly() {
    const layout = {
        margin: { t: 0, b: 0, l: 0, r: 0 },
        paper_bgcolor: '#050505',
        scene: {
            xaxis: { 
                title: '', 
                showgrid: true, gridcolor: '#222', 
                zeroline: true, zerolinewidth: 5, zerolinecolor: '#aa0000', 
                showticklabels: false,
                showbackground: false 
            },
            yaxis: { 
                title: '', 
                showgrid: true, gridcolor: '#222', 
                zeroline: true, zerolinewidth: 5, zerolinecolor: '#00aa00',
                showticklabels: false,
                showbackground: false
            },
            zaxis: { 
                title: '', 
                showgrid: true, gridcolor: '#222', 
                zeroline: true, zerolinewidth: 5, zerolinecolor: '#0000aa',
                showticklabels: false,
                showbackground: false
            },
            bgcolor: '#050505',
            dragmode: 'orbit'
        },
        showlegend: false,
        hovermode: 'closest'
    };
    
    Plotly.newPlot('chart-container', [], layout, { responsive: true, displayModeBar: false });

    document.getElementById('chart-container').on('plotly_click', function(data){
        const pontoIndex = data.points[0].pointNumber;
        
        setTimeout(() => {
            gerenciarClique(pontoIndex);
        }, 0);
    });
}

function plotarGrafico() {
    const data = localVectorDB.getAll();
    if (data.length === 0) {
        if(document.getElementById('chart-container').data) {
                Plotly.react('chart-container', [], document.getElementById('chart-container').layout);
        }
        return;
    }

    const x = [], y = [], z = [], text = [];
    const colors = [], markerSizes = [], fontSizes = [];
    
    data.forEach((item, index) => {
        if (!item.reducedVector || item.reducedVector.length < 3) return;
        x.push(item.reducedVector[0]);
        y.push(item.reducedVector[1]);
        z.push(item.reducedVector[2]);
        text.push(item.text);

        if (pontosSelecionados.includes(index)) {
            colors.push('#ffff00');
            markerSizes.push(20);
            fontSizes.push(25); 
        } else {
            colors.push('#0088ff');
            markerSizes.push(8);
            fontSizes.push(14);
        }
    });

    const trace = {
        x: x, y: y, z: z,
        mode: 'markers+text',
        text: text,
        textposition: 'top center',
        
        textfont: { 
            family: 'Verdana, sans-serif',
            size: fontSizes, 
            color: '#ffffff' 
        },
        
        hoverinfo: 'none', 
        marker: {
            size: markerSizes,
            color: colors,
            opacity: 0.9,
            line: { color: 'black', width: 1 }
        },
        type: 'scatter3d'
    };
    const chartDiv = document.getElementById('chart-container');
    const currentLayout = chartDiv.layout || {};
    
    Plotly.react('chart-container', [trace], currentLayout);
}

function gerenciarClique(index) {
    // Adiciona ou remove da seleção
    if (pontosSelecionados.includes(index)) {
        pontosSelecionados = pontosSelecionados.filter(i => i !== index);
        document.getElementById('comparison-panel').style.display = 'none';
    } else {
        pontosSelecionados.push(index);
    }

    if (pontosSelecionados.length > 2) pontosSelecionados.shift();

    plotarGrafico();

    if (pontosSelecionados.length === 2) {
        calcularDiferenca(pontosSelecionados[0], pontosSelecionados[1]);
    }
}

function calcularDiferenca(idxA, idxB) {
    const itemA = localVectorDB.getAll()[idxA];
    const itemB = localVectorDB.getAll()[idxB];

    const similaridade = cosineSimilarity(itemA.vector, itemB.vector);
    
    document.getElementById('comp-a').innerText = itemA.text;
    document.getElementById('comp-b').innerText = itemB.text;
    document.getElementById('comp-result').innerText = (similaridade * 100).toFixed(1) + '%';
    document.getElementById('comparison-panel').style.display = 'block';
}

function cosineSimilarity(vecA, vecB) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function atualizarStatus(msg) {
    document.getElementById('status-bar').innerText = "> " + msg;
}

init();